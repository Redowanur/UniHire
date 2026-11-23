import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { LinkArrow, SectionHeader } from "@/components/ui/section-header";
import { JobCard } from "@/components/home/job-card";
import { fetchJobs } from "@/lib/api";

async function HiringFeedList() {
  const data = await fetchJobs({ limit: 6 }).catch(() => null);
  const jobs = data?.jobs ?? [];

  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-body">
        No open roles yet — be the first cohort to invite a recruiter.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function HiringFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[124px] animate-pulse rounded-2xl border border-line bg-surface" />
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
