"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Check, Inbox, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { InviteStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  createJob,
  deleteJob,
  fetchMyCampusInvites,
  fetchMyJobs,
  JOB_CATEGORIES,
  respondToCampusInvite,
  type CampusInvite,
  type JobListing,
} from "@/lib/api";

const jobTypeItems = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];
const workPlaceItems = [
  { value: "onsite", label: "Onsite" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];
const categoryItems = JOB_CATEGORIES.map((c) => ({ value: c.value as string, label: c.label }));

const emptyJobForm = {
  title: "",
  job_type: "full_time" as JobListing["job_type"],
  category: "engineering",
  experience: "",
  salary: "",
  office_hours: "",
  work_place: "onsite" as JobListing["work_place"],
  vacancy: "1",
  location: "",
  description: "",
  responsibilities: "",
  requirements: "",
  skills: "",
  benefits: "",
};

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function PickField({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(v) => onChange(v ?? value)} items={items}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function EmptyState({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      <span className="grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5" />
      </span>
      <p className="max-w-sm">{children}</p>
    </div>
  );
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();
  const [invites, setInvites] = useState<CampusInvite[] | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [creatingJob, setCreatingJob] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user && user.user_type === "student") router.replace("/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "recruiter") return;
    fetchMyCampusInvites(accessToken)
      .then(setInvites)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load your invites."));
    fetchMyJobs(user.email).then(setJobs).catch(() => undefined);
  }, [accessToken, user]);

  async function respond(invite: CampusInvite, next: "accepted" | "rejected") {
    if (!accessToken) return;
    setRespondingId(invite.id);
    try {
      const updated = await respondToCampusInvite(invite.id, next, accessToken);
      setInvites((current) => current?.map((i) => (i.id === updated.id ? updated : i)) ?? null);
      toast.success(next === "accepted" ? "Invitation accepted" : "Invitation declined");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update that invite.");
    } finally {
      setRespondingId(null);
    }
  }

  async function handleCreateJob(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setCreatingJob(true);
    try {
      const { job_id } = await createJob(
        {
          title: jobForm.title.trim(),
          job_type: jobForm.job_type,
          experience: jobForm.experience.trim(),
          salary: jobForm.salary.trim(),
          office_hours: jobForm.office_hours.trim(),
          work_place: jobForm.work_place,
          vacancy: Number(jobForm.vacancy),
          location: jobForm.location.trim(),
          category: jobForm.category,
          description: jobForm.description.trim(),
          responsibilities: splitList(jobForm.responsibilities),
          requirements: splitList(jobForm.requirements),
          skills: splitList(jobForm.skills),
          benefits: splitList(jobForm.benefits),
        },
        accessToken,
      );
      setJobs((current) => [
        {
          id: job_id,
          title: jobForm.title.trim(),
          company_name: user?.company_name ?? "",
          job_type: jobForm.job_type,
          experience: jobForm.experience.trim(),
          salary: jobForm.salary.trim(),
          office_hours: jobForm.office_hours.trim(),
          work_place: jobForm.work_place,
          vacancy: Number(jobForm.vacancy),
          location: jobForm.location.trim(),
          category: jobForm.category,
        },
        ...current,
      ]);
      setShowJobForm(false);
      setJobForm(emptyJobForm);
      toast.success("Job post published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't post this job.");
    } finally {
      setCreatingJob(false);
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!accessToken) return;
    try {
      await deleteJob(jobId, accessToken);
      setJobs((current) => current.filter((j) => j.id !== jobId));
      setDeleteTarget(null);
      toast.success("Job post deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this job post.");
    }
  }

  if (status === "loading" || !user || invites === null) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const pending = invites.filter((i) => i.status === "pending");
  const accepted = invites.filter((i) => i.status === "accepted");
  const rejected = invites.filter((i) => i.status === "rejected");

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Recruiter dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.company_name}</p>
          </div>
          <Button onClick={() => setShowJobForm(true)} disabled={!user.is_verified} className="gap-2">
            <Plus /> Post a job
          </Button>
        </div>
        {!user.is_verified ? (
          <p className="mt-4 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground">
            Verify your email to post jobs and receive campus invites. Check your inbox for the verification link.
          </p>
        ) : null}

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          <Tabs defaultValue="invites">
            <ScrollArea className="w-full">
              <TabsList className="group-data-horizontal/tabs:h-11">
                <TabsTrigger value="invites" className="gap-2 px-4">
                  Invitations
                  {pending.length > 0 ? <Badge className="h-5 min-w-5 px-1.5">{pending.length}</Badge> : null}
                </TabsTrigger>
                <TabsTrigger value="cohorts" className="px-4">Cohorts</TabsTrigger>
                <TabsTrigger value="jobs" className="px-4">Job posts</TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="invites" className="animate-overlay-in mt-2 space-y-6">
              {pending.length === 0 ? (
                <EmptyState icon={Inbox}>No pending invitations right now.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {pending.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{invite.cohort_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {invite.job_title ? `Re: ${invite.job_title}` : "General outreach"}
                        </p>
                        {invite.message ? (
                          <p className="mt-1 max-w-md text-xs text-muted-foreground">
                            &ldquo;{invite.message}&rdquo;
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={respondingId === invite.id}
                          onClick={() => respond(invite, "accepted")}
                        >
                          <Check /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={respondingId === invite.id}
                          onClick={() => respond(invite, "rejected")}
                        >
                          <X /> Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {rejected.length > 0 ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Declined</h2>
                  <ul className="space-y-2">
                    {rejected.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 opacity-70"
                      >
                        <p className="text-sm font-medium">{invite.cohort_name}</p>
                        <InviteStatusBadge status={invite.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="cohorts" className="animate-overlay-in mt-2">
              {accepted.length === 0 ? (
                <EmptyState icon={Users}>Accepted invitations will show up here.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {accepted.map((invite) => (
                    <li key={invite.id}>
                      <Link
                        href={`/recruiter/cohorts/${invite.cohort_id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{invite.cohort_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.job_title ? `Re: ${invite.job_title}` : "General outreach"}
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="jobs" className="animate-overlay-in mt-2">
              {jobs.length === 0 ? (
                <EmptyState icon={Briefcase}>
                  Post a job so cohorts can find and invite you to campus.
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {jobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5"
                    >
                      <Link href={`/hiring/${job.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold hover:text-primary">{job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.location} · {job.salary}
                        </p>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete job post"
                        onClick={() => setDeleteTarget(job)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-5">
            <DialogTitle>Post a job</DialogTitle>
            <DialogDescription>Cohorts will be able to find this and invite you to campus.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateJob} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Job title">
                <Input
                  required
                  minLength={5}
                  maxLength={50}
                  placeholder="e.g. Backend Engineer Intern"
                  value={jobForm.title}
                  onChange={(event) => setJobForm((f) => ({ ...f, title: event.target.value }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <PickField
                  label="Job type"
                  value={jobForm.job_type}
                  items={jobTypeItems}
                  onChange={(v) => setJobForm((f) => ({ ...f, job_type: v as JobListing["job_type"] }))}
                />
                <PickField
                  label="Workplace"
                  value={jobForm.work_place}
                  items={workPlaceItems}
                  onChange={(v) => setJobForm((f) => ({ ...f, work_place: v as JobListing["work_place"] }))}
                />
                <PickField
                  label="Category"
                  value={jobForm.category}
                  items={categoryItems}
                  onChange={(v) => setJobForm((f) => ({ ...f, category: v }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Experience">
                  <Input
                    required
                    placeholder="e.g. 0-1 years"
                    value={jobForm.experience}
                    onChange={(event) => setJobForm((f) => ({ ...f, experience: event.target.value }))}
                  />
                </Field>
                <Field label="Salary">
                  <Input
                    required
                    placeholder="e.g. ৳30,000 - ৳45,000"
                    value={jobForm.salary}
                    onChange={(event) => setJobForm((f) => ({ ...f, salary: event.target.value }))}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Office hours">
                  <Input
                    required
                    placeholder="9am - 6pm"
                    value={jobForm.office_hours}
                    onChange={(event) => setJobForm((f) => ({ ...f, office_hours: event.target.value }))}
                  />
                </Field>
                <Field label="Location">
                  <Input
                    required
                    placeholder="Dhaka, Bangladesh"
                    value={jobForm.location}
                    onChange={(event) => setJobForm((f) => ({ ...f, location: event.target.value }))}
                  />
                </Field>
                <Field label="Vacancies">
                  <Input
                    required
                    type="number"
                    min={1}
                    value={jobForm.vacancy}
                    onChange={(event) => setJobForm((f) => ({ ...f, vacancy: event.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  required
                  rows={3}
                  value={jobForm.description}
                  onChange={(event) => setJobForm((f) => ({ ...f, description: event.target.value }))}
                />
              </Field>
              {(
                [
                  ["responsibilities", "Responsibilities"],
                  ["requirements", "Requirements"],
                  ["skills", "Skills"],
                  ["benefits", "Benefits"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={`${label} (comma-separated)`}>
                  <Input
                    required
                    value={jobForm[key]}
                    onChange={(event) => setJobForm((f) => ({ ...f, [key]: event.target.value }))}
                  />
                </Field>
              ))}
            </div>
            <DialogFooter className="m-0 rounded-none border-t p-4">
              <Button type="button" variant="outline" onClick={() => setShowJobForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingJob} className="gap-2">
                {creatingJob ? <Spinner /> : null}
                Publish job post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this job post?</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed from the hiring page. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDeleteJob(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
