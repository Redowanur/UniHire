import { Suspense } from "react";

import { JobCard } from "@/components/home/job-card";
import { Container } from "@/components/ui/container";
import { LinkArrow, SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJobs } from "@/lib/api";

async function HiringFeedList() {
  const data = await fetchJobs({ limit: 6 }).catch(() => null);
  const jobs = data?.jobs ?? [];

  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        No open roles yet — be the first cohort to invite a recruiter.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {jobs.map((job, index) => (
        <div key={job.id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
          <JobCard job={job} className="h-full" />
        </div>
      ))}
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-28" />
      </div>
    </div>
  );
}

function HiringFeedSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HiringFeed() {
  return (
    <section className="py-14 md:py-20">
      <Container>
        <SectionHeader
          align="left"
          title="Companies hiring right now"
          description="Every open role posted by a verified recruiter — invite the ones worth bringing to your campus."
          action={
            <LinkArrow href="/hiring" className="hidden md:inline-flex">
              View all
            </LinkArrow>
          }
        />
        <Suspense fallback={<HiringFeedSkeleton />}>
          <HiringFeedList />
        </Suspense>
        <div className="mt-8 flex justify-center md:hidden">
          <LinkArrow href="/hiring">View all</LinkArrow>
        </div>
      </Container>
    </section>
  );
}
