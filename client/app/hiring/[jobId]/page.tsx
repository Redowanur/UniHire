import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { colorFor, initialsFor, jobTypeLabel, workPlaceLabel } from "@/components/home/job-card";
import { InviteToCampusButton } from "@/components/hiring/invite-to-campus-button";
import { fetchJob } from "@/lib/api";

async function JobDetail({ jobId }: { jobId: string }) {
  const job = await fetchJob(jobId).catch(() => null);

  if (!job) notFound();

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl text-base font-bold text-white"
            style={{ backgroundColor: colorFor(job.company_name) }}
            aria-hidden="true"
          >
            {initialsFor(job.company_name)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-heading md:text-3xl">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-body">{job.company_name}</p>
          </div>
        </div>
        <InviteToCampusButton job={job} />
      </div>

      <ul className="mt-6 flex flex-wrap items-center gap-2">
        <li>
          <Badge icon="clock">{jobTypeLabel[job.job_type]}</Badge>
        </li>
        <li>
          <Badge icon="building">{workPlaceLabel[job.work_place]}</Badge>
        </li>
        <li>
          <Badge icon="dollar-sign">{job.salary}</Badge>
        </li>
        <li>
          <Badge icon="map-pin">{job.location}</Badge>
        </li>
      </ul>

      <div className="mt-8 grid gap-6 text-sm text-body sm:grid-cols-2">
        <div>
          <p className="font-semibold text-heading">Experience</p>
          <p className="mt-1">{job.experience}</p>
        </div>
        <div>
          <p className="font-semibold text-heading">Office hours</p>
          <p className="mt-1">{job.office_hours}</p>
        </div>
        <div>
          <p className="font-semibold text-heading">Vacancies</p>
          <p className="mt-1">{job.vacancy}</p>
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h2 className="font-display text-lg font-semibold text-heading">Description</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-body">{job.description}</p>
      </div>

      {[
        { title: "Responsibilities", items: job.responsibilities },
        { title: "Requirements", items: job.requirements },
        { title: "Skills", items: job.skills },
        { title: "Benefits", items: job.benefits },
      ]
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <div key={section.title} className="mt-8 border-t border-line pt-6">
            <h2 className="font-display text-lg font-semibold text-heading">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-body">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function JobDetailSkeleton() {
  return <div className="h-[480px] animate-pulse rounded-2xl border border-line bg-white" />;
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl px-4">
        <Link
          href="/hiring"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-body transition-colors hover:text-primary-600"
        >
          <ArrowLeft className="size-4" />
          Back to listings
        </Link>

        <div className="mt-5">
          <Suspense fallback={<JobDetailSkeleton />}>
            <JobDetailAsync params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function JobDetailAsync({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <JobDetail jobId={jobId} />;
}
