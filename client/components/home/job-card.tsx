import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { InviteToCampusButton } from "@/components/hiring/invite-to-campus-button";
import type { JobListing } from "@/lib/api";
import { cn } from "@/lib/utils";

export const jobTypeLabel: Record<JobListing["job_type"], string> = {
  full_time: "Full time",
  part_time: "Part time",
  internship: "Internship",
  contract: "Contract",
};

export const workPlaceLabel: Record<JobListing["work_place"], string> = {
  remote: "Remote",
  onsite: "Onsite",
  hybrid: "Hybrid",
};

export function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const avatarPalette = ["#6d53ec", "#f58a0f", "#2563eb", "#0d9488", "#be185d", "#7c3aed"];

export function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}

export function JobCard({ job, className }: { job: JobListing; className?: string }) {
  return (
    <article
      className={cn(
        "group rounded-2xl border border-line bg-white p-5 shadow-card transition-colors hover:border-primary-200 md:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <Link href={`/hiring/${job.id}`} className="flex min-w-0 items-center gap-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: colorFor(job.company_name) }}
            aria-hidden="true"
          >
            {initialsFor(job.company_name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-heading transition-colors group-hover:text-primary-600">
              {job.title}
            </h3>
            <p className="mt-0.5 truncate text-sm text-body">{job.company_name}</p>
          </div>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <ul className="flex flex-wrap items-center gap-2">
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
        <InviteToCampusButton job={job} className="w-full md:w-auto" />
      </div>
    </article>
  );
}
