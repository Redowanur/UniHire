"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { VerifyNotice } from "@/components/auth/verify-notice";
import { JobFormDialog } from "@/components/recruiter/job-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteJob,
  fetchJob,
  fetchMyJobs,
  type JobDetail,
  type JobListing,
} from "@/lib/api";

export default function RecruiterPostsPage() {
  const router = useRouter();
  const { user, status, accessToken, refreshUser } = useAuth();

  const [jobs, setJobs] = useState<JobListing[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobDetail | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobListing | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user && user.user_type === "student") router.replace("/cohort");
  }, [status, user, router]);

  function loadJobs(email: string) {
    fetchMyJobs(email)
      .then(setJobs)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load your posts."));
  }

  useEffect(() => {
    if (user?.user_type !== "recruiter" || !user.is_verified) return;
    loadJobs(user.email);
  }, [user]);

  async function openEdit(job: JobListing) {
    setLoadingEditId(job.id);
    try {
      // The list row has only a summary; the form needs the full post
      setEditTarget(await fetchJob(job.id));
      setFormOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't open this post.");
    } finally {
      setLoadingEditId(null);
    }
  }

  function openNew() {
    setEditTarget(null);
    setFormOpen(true);
  }

  async function handleDelete(jobId: string) {
    if (!accessToken) return;
    try {
      await deleteJob(jobId, accessToken);
      setJobs((current) => current?.filter((j) => j.id !== jobId) ?? null);
      setDeleteTarget(null);
      toast.success("Job post deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete this job post.");
    }
  }

  if (user && user.user_type === "recruiter" && !user.is_verified) {
    return (
      <VerifyNotice
        email={user.email}
        accessToken={accessToken}
        onCheck={refreshUser}
        afterVerified="post jobs and receive campus invites"
      />
    );
  }

  if (status === "loading" || !user || user.user_type !== "recruiter" || jobs === null) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Posts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your job posts at {user.company_name}
            </p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus /> Post a job
          </Button>
        </div>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              <span className="grid size-11 place-items-center rounded-full bg-muted">
                <Briefcase className="size-5" />
              </span>
              <p className="max-w-sm">Post a job so cohorts can find and invite you to campus.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3.5"
                >
                  <Link href={`/hiring/${job.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold hover:text-primary">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.location} · {job.salary}
                    </p>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingEditId === job.id}
                    onClick={() => openEdit(job)}
                    className="gap-1.5"
                  >
                    {loadingEditId === job.id ? <Spinner /> : <Pencil />}
                    Edit
                  </Button>
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
        </div>
      </div>

      <JobFormDialog
        open={formOpen}
        job={editTarget}
        accessToken={accessToken}
        onOpenChange={setFormOpen}
        onSaved={() => loadJobs(user.email)}
      />

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
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
