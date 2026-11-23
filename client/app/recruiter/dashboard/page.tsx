"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  createJob,
  deleteJob,
  fetchMyCampusInvites,
  fetchMyJobs,
  respondToCampusInvite,
  type CampusInvite,
  type JobListing,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400";

const emptyJobForm = {
  title: "",
  job_type: "full_time" as JobListing["job_type"],
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

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();
  const [invites, setInvites] = useState<CampusInvite[] | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [creatingJob, setCreatingJob] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
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
        },
        ...current,
      ]);
      setShowJobForm(false);
      setJobForm(emptyJobForm);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this job post.");
    }
  }

  if (status === "loading" || !user || invites === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  const pending = invites.filter((i) => i.status === "pending");
  const accepted = invites.filter((i) => i.status === "accepted");
  const rejected = invites.filter((i) => i.status === "rejected");

  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <h1 className="font-display text-2xl font-bold text-heading">Recruiter dashboard</h1>
        <p className="mt-1 text-sm text-body">{user.company_name}</p>

        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-heading">Your job posts</h2>
            <button
              type="button"
              onClick={() => setShowJobForm((v) => !v)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
            >
              <Plus className="size-3.5" />
              Post a job
            </button>
          </div>

          {jobs.length === 0 && !showJobForm ? (
            <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-body">
              Post a job so cohorts can find and invite you to campus.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">{job.title}</p>
                    <p className="text-xs text-muted">
                      {job.location} · {job.salary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete job post"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showJobForm ? (
            <form
              onSubmit={handleCreateJob}
              className="mt-4 flex flex-col gap-4 rounded-2xl border border-line bg-white p-5"
            >
              <input
                required
                minLength={5}
                maxLength={50}
                placeholder="Job title (e.g. Backend Engineer Intern)"
                value={jobForm.title}
                onChange={(event) => setJobForm((f) => ({ ...f, title: event.target.value }))}
                className="h-11 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-primary-400"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={jobForm.job_type}
                  onChange={(event) =>
                    setJobForm((f) => ({ ...f, job_type: event.target.value as JobListing["job_type"] }))
                  }
                  className={selectClass}
                >
                  <option value="full_time">Full time</option>
                  <option value="part_time">Part time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
                <select
                  value={jobForm.work_place}
                  onChange={(event) =>
                    setJobForm((f) => ({ ...f, work_place: event.target.value as JobListing["work_place"] }))
                  }
                  className={selectClass}
                >
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="Experience (e.g. 0-1 years)"
                  value={jobForm.experience}
                  onChange={(event) => setJobForm((f) => ({ ...f, experience: event.target.value }))}
                  className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                />
                <input
                  required
                  placeholder="Salary (e.g. ৳30,000 - ৳45,000)"
                  value={jobForm.salary}
                  onChange={(event) => setJobForm((f) => ({ ...f, salary: event.target.value }))}
                  className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  placeholder="Office hours"
                  value={jobForm.office_hours}
                  onChange={(event) => setJobForm((f) => ({ ...f, office_hours: event.target.value }))}
                  className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                />
                <input
                  required
                  placeholder="Location"
                  value={jobForm.location}
                  onChange={(event) => setJobForm((f) => ({ ...f, location: event.target.value }))}
                  className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                />
                <input
                  required
                  type="number"
                  min={1}
                  placeholder="Vacancies"
                  value={jobForm.vacancy}
                  onChange={(event) => setJobForm((f) => ({ ...f, vacancy: event.target.value }))}
                  className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                />
              </div>

              <textarea
                required
                placeholder="Description"
                rows={3}
                value={jobForm.description}
                onChange={(event) => setJobForm((f) => ({ ...f, description: event.target.value }))}
                className="resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-primary-400"
              />

              <input
                required
                placeholder="Responsibilities (comma-separated)"
                value={jobForm.responsibilities}
                onChange={(event) => setJobForm((f) => ({ ...f, responsibilities: event.target.value }))}
                className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
              />
              <input
                required
                placeholder="Requirements (comma-separated)"
                value={jobForm.requirements}
                onChange={(event) => setJobForm((f) => ({ ...f, requirements: event.target.value }))}
                className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
              />
              <input
                required
                placeholder="Skills (comma-separated)"
                value={jobForm.skills}
                onChange={(event) => setJobForm((f) => ({ ...f, skills: event.target.value }))}
                className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
              />
              <input
                required
                placeholder="Benefits (comma-separated)"
                value={jobForm.benefits}
                onChange={(event) => setJobForm((f) => ({ ...f, benefits: event.target.value }))}
                className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
              />

              <button
                type="submit"
                disabled={creatingJob}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {creatingJob ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Publish job post
              </button>
            </form>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-heading">Campus invitations</h2>
          {pending.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-body">
              No pending invitations right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pending.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-heading">{invite.cohort_name}</p>
                    <p className="text-xs text-muted">
                      {invite.job_title ? `Re: ${invite.job_title}` : "General outreach"}
                    </p>
                    {invite.message ? (
                      <p className="mt-1 max-w-md text-xs text-body">&ldquo;{invite.message}&rdquo;</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={respondingId === invite.id}
                      onClick={() => respond(invite, "accepted")}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                    >
                      <Check className="size-3.5" />
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === invite.id}
                      onClick={() => respond(invite, "rejected")}
                      className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-xs font-semibold text-heading transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                    >
                      <X className="size-3.5" />
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-heading">Your cohorts</h2>
          {accepted.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-body">
              Accepted invitations will show up here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {accepted.map((invite) => (
                <li key={invite.id}>
                  <Link
                    href={`/recruiter/cohorts/${invite.cohort_id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-primary-300"
                  >
                    <div>
                      <p className="text-sm font-semibold text-heading">{invite.cohort_name}</p>
                      <p className="text-xs text-muted">
                        {invite.job_title ? `Re: ${invite.job_title}` : "General outreach"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-primary-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {rejected.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-heading">Declined</h2>
            <ul className="mt-3 space-y-2">
              {rejected.map((invite) => (
                <li
                  key={invite.id}
                  className={cn("rounded-xl border border-line bg-white px-4 py-3 opacity-60")}
                >
                  <p className="text-sm font-semibold text-heading">{invite.cohort_name}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
