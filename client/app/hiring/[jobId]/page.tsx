import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Banknote, Briefcase, Building2, Clock, MapPin, Users } from "lucide-react";

import { InviteToCampusButton } from "@/components/hiring/invite-to-campus-button";
import { CompanyMark, jobTypeLabel, workPlaceLabel } from "@/components/home/job-card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fetchJob } from "@/lib/api";

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-sm">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

async function JobDetail({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await fetchJob(jobId).catch(() => null);
  if (!job) notFound();

  const sections = [
    { key: "responsibilities", title: "Responsibilities", items: job.responsibilities },
    { key: "requirements", title: "Requirements", items: job.requirements },
    { key: "skills", title: "Skills", items: job.skills },
    { key: "benefits", title: "Benefits", items: job.benefits },
  ].filter((section) => section.items.length > 0);

  return (
    <>
      <Breadcrumb className="mb-5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/hiring">Hiring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[40vw] truncate">{job.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="animate-fade-up">
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <CompanyMark name={job.company_name} className="size-14 rounded-2xl text-base" />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{job.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{job.company_name}</p>
              </div>
            </div>
            <InviteToCampusButton job={job} className="w-full sm:w-auto" />
          </div>

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

          <div className="grid gap-3 sm:grid-cols-3">
            <Fact icon={Briefcase} label="Experience" value={job.experience} />
            <Fact icon={Clock} label="Office hours" value={job.office_hours} />
            <Fact icon={Users} label="Vacancies" value={job.vacancy} />
          </div>

          <div>
            <h2 className="text-lg font-semibold">About the role</h2>
            <p className="mt-2 text-sm leading-6 whitespace-pre-line text-muted-foreground">
              {job.description}
            </p>
          </div>

          {sections.length > 0 ? (
            <Accordion
              multiple
              defaultValue={sections.slice(0, 2).map((s) => s.key)}
              className="rounded-xl border px-4"
            >
              {sections.map((section) => (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger className="text-base font-semibold">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pb-2">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-5 rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  return (
    <div className="bg-secondary/40 py-8 md:py-12">
      <Container className="max-w-3xl">
        <Suspense fallback={<JobDetailSkeleton />}>
          <JobDetail params={params} />
        </Suspense>
      </Container>
    </div>
  );
}
