import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { JobCard } from "@/components/home/job-card";
import { fetchJobs } from "@/lib/api";
import { cn } from "@/lib/utils";

const selectClass =
  "h-11 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-heading outline-none transition-colors focus:border-primary-400";

type HiringSearchParams = {
  search?: string;
  job_type?: string;
  work_place?: string;
  page?: string;
};

async function HiringResults({
  searchParams,
}: {
  searchParams: Promise<HiringSearchParams>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const data = await fetchJobs({
    search: params.search,
    job_type: params.job_type,
    work_place: params.work_place,
    page,
    limit: 12,
  }).catch(() => null);

  const jobs = data?.jobs ?? [];
  const totalPages = data?.total_pages ?? 1;

  function pageHref(target: number) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.job_type) query.set("job_type", params.job_type);
    if (params.work_place) query.set("work_place", params.work_place);
    query.set("page", String(target));
    return `/hiring?${query.toString()}`;
  }

  return (
    <>
      <form
        method="get"
        className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card"
      >
        <input
          type="text"
          name="search"
          defaultValue={params.search}
          placeholder="Search by role or company"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-heading outline-none placeholder:text-muted focus:border-primary-400"
        />
        <select name="job_type" defaultValue={params.job_type ?? ""} className={selectClass}>
          <option value="">Any job type</option>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
        <select name="work_place" defaultValue={params.work_place ?? ""} className={selectClass}>
          <option value="">Any workplace</option>
          <option value="onsite">Onsite</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          Filter
        </button>
      </form>

      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-body">
          No open roles match those filters yet.
        </p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              className={cn(
                "grid size-10 place-items-center rounded-full text-sm font-semibold transition-colors",
                p === page
                  ? "bg-primary-500 text-white"
                  : "border border-line bg-white text-heading hover:border-primary-300",
              )}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}

function HiringResultsSkeleton() {
  return (
    <>
      <div className="mb-8 h-[68px] animate-pulse rounded-2xl border border-line bg-white" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[124px] animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
    </>
  );
}

export default function HiringPage({
  searchParams,
}: {
  searchParams: Promise<HiringSearchParams>;
}) {
  return (
    <div className="bg-surface/60 py-12 md:py-16">
      <Container>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-heading md:text-4xl">
            Who&apos;s hiring
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-body">
            Every open role posted by a verified recruiter. Invite the ones worth bringing
            to your campus.
          </p>
        </div>

        <Suspense fallback={<HiringResultsSkeleton />}>
          <HiringResults searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}
