import Link from "next/link";
import { Banknote, Building2, Clock, MapPin } from "lucide-react";

import { InviteToCampusButton } from "@/components/hiring/invite-to-campus-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const avatarPalette = [
  "oklch(0.55 0.22 285)",
  "oklch(0.68 0.17 55)",
  "oklch(0.55 0.18 255)",
  "oklch(0.58 0.12 185)",
  "oklch(0.55 0.2 350)",
  "oklch(0.5 0.2 305)",
];

export function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}

export function CompanyMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: colorFor(name) }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}

export function JobCard({ job, className }: { job: JobListing; className?: string }) {
  return (
    <Card
      className={cn(
        "group/job relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <CompanyMark name={job.company_name} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold">
              <Link
                href={`/hiring/${job.id}`}
                className="transition-colors group-hover/job:text-primary after:absolute after:inset-0 after:z-0 after:content-['']"
              >
                {job.title}
              </Link>
            </h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{job.company_name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <Badge variant="secondary" className="h-7 gap-1.5 px-2.5">
                <Clock /> {jobTypeLabel[job.job_type]}
              </Badge>
            </li>
            <li>
              <Badge variant="secondary" className="h-7 gap-1.5 px-2.5">
                <Building2 /> {workPlaceLabel[job.work_place]}
              </Badge>
            </li>
            <li>
              <Badge variant="secondary" className="h-7 gap-1.5 px-2.5">
                <Banknote /> {job.salary}
              </Badge>
            </li>
            <li>
              <Badge variant="secondary" className="h-7 gap-1.5 px-2.5">
                <MapPin /> {job.location}
              </Badge>
            </li>
          </ul>
          <InviteToCampusButton job={job} className="relative z-10 w-full sm:w-auto" />
        </div>
      </CardContent>
    </Card>
  );
}
