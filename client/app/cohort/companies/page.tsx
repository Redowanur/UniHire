"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { InviteStatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyCampusInvites, type CampusInvite } from "@/lib/api";

export default function CohortCompaniesPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();
  const [invites, setInvites] = useState<CampusInvite[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user?.user_type === "recruiter") router.replace("/recruiter/cohorts");
    else if (user?.user_type === "student" && !user.cohort_id) router.replace("/onboarding/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "student" || !user.cohort_id) return;
    fetchMyCampusInvites(accessToken)
      .then(setInvites)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load companies."));
  }, [accessToken, user]);

  if (!user || user.user_type !== "student" || invites === null) {
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
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Companies your cohort has invited to campus, and where each invite stands.
          </p>
        </div>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          {invites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              <span className="grid size-11 place-items-center rounded-full bg-muted">
                <Building2 className="size-5" />
              </span>
              <p className="max-w-sm">
                No companies invited yet. Head to{" "}
                <Link href="/hiring" className="font-semibold text-primary">
                  who&apos;s hiring
                </Link>{" "}
                to send your first invite.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {invites.map((invite) => (
                <li key={invite.id} className="rounded-xl border bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{invite.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.job_title ?? "General outreach"} · invited by{" "}
                        {invite.invited_by === user.id ? "you" : "a cohort member"}
                      </p>
                    </div>
                    <InviteStatusBadge status={invite.status} />
                  </div>
                  {invite.message ? (
                    <p className="mt-2 text-xs text-muted-foreground">&ldquo;{invite.message}&rdquo;</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
