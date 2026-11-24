import { Suspense } from "react";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";

import { FilterDrawer, FilterSidebar, SortSelect, SALARY_MAX, SALARY_MIN } from "@/components/hiring/filters";
import { JobCardSkeleton } from "@/components/home/hiring-feed";
import { JobCard } from "@/components/home/job-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { fetchJobs } from "@/lib/api";

type HiringSearchParams = {
  search?: string;
  job_type?: string;
  work_place?: string;
  location?: string;
  category?: string;
  posted_within?: string;
  salary_min?: string;
  salary_max?: string;
  sort?: string;
  page?: string;
};

const FILTER_KEYS = [
  "job_type",
  "work_place",
  "location",
  "category",
  "posted_within",
  "salary_min",
  "salary_max",
  "sort",
] as const;

function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

async function HiringResults({ searchParams }: { searchParams: Promise<HiringSearchParams> }) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const data = await fetchJobs({
    search: params.search,
    job_type: params.job_type,
    work_place: params.work_place,
    location: params.location,
    category: params.category,
    posted_within: params.posted_within ? Number(params.posted_within) : undefined,
    salary_min: params.salary_min ? Number(params.salary_min) : undefined,
    salary_max: params.salary_max ? Number(params.salary_max) : undefined,
    sort: params.sort,
    page,
    limit: 8,
  }).catch(() => null);

  const jobs = data?.jobs ?? [];
  const totalPages = data?.total_pages ?? 1;

  function pageHref(target: number) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    for (const key of FILTER_KEYS) {
      const value = params[key];
      if (value) query.set(key, value);
    }
    query.set("page", String(target));
    return `/hiring?${query.toString()}`;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {data ? (
          <>
            <span className="font-semibold text-foreground">{data.total_jobs}</span>{" "}
            {data.total_jobs === 1 ? "role" : "roles"} found
          </>
        ) : (
          "Couldn't load roles right now."
        )}
      </p>
      <Suspense fallback={null}>
        <SortSelect />
      </Suspense>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-5" />
          </span>
          <p className="font-medium">No open roles match those filters yet.</p>
          <Link href="/hiring" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Clear all filters
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <div key={job.id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
              <JobCard job={job} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <Pagination className="mt-8">
          <PaginationContent className="flex-wrap justify-center">
            <PaginationItem>
              <PaginationPrevious
                href={pageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {pageWindow(page, totalPages).map((p, i) => (
              <PaginationItem key={`${p}-${i}`}>
                {p === "gap" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink href={pageHref(p)} isActive={p === page}>
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </>
  );
}

function HiringResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function Toolbar({ searchParams }: { searchParams: Promise<HiringSearchParams> }) {
  const params = await searchParams;
  const activeCount =
    FILTER_KEYS.filter((key) => {
      if (key === "sort") return false;
      if (key === "salary_min") return Number(params.salary_min) > SALARY_MIN;
      if (key === "salary_max") return params.salary_max && Number(params.salary_max) < SALARY_MAX;
      return Boolean(params[key]);
    }).length;

  return (
    <form action="/hiring" method="get" className="mb-6 flex gap-2">
      {FILTER_KEYS.map((key) =>
        params[key] ? <input key={key} type="hidden" name={key} value={params[key]} /> : null,
      )}
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          name="search"
          defaultValue={params.search}
          placeholder="Search by role or company"
          className="h-12 bg-card pl-11"
        />
      </div>
      <Button type="submit" size="lg" className="hidden sm:inline-flex">
        Search
      </Button>
      <FilterDrawer activeCount={activeCount} />
    </form>
  );
}

export default function HiringPage({
  searchParams,
}: {
  searchParams: Promise<HiringSearchParams>;
}) {
  return (
    <div className="bg-secondary/40 py-10 md:py-14">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Who&apos;s hiring</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            Every open role posted by a verified recruiter. Invite the ones worth bringing to your
            campus.
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Suspense fallback={null}>
            <FilterSidebar />
          </Suspense>
          <div className="min-w-0">
            <Suspense fallback={null}>
              <Toolbar searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<HiringResultsSkeleton />}>
              <HiringResults searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}
