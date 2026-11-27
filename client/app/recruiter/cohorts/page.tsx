"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Inbox, Users, X } from "lucide-react";
import { toast } from "sonner";

import { VerifyNotice } from "@/components/auth/verify-notice";
import { InviteStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyCampusInvites, respondToCampusInvite, type CampusInvite } from "@/lib/api";

function EmptyState({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-10 text-center text-sm text-muted-foreground">
      <span className="grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5" />
      </span>
      <p className="max-w-sm">{children}</p>
    </div>
  );
}

export default function RecruiterCohortsPage() {
  const router = useRouter();
  const { user, status, accessToken, refreshUser } = useAuth();
  const [invites, setInvites] = useState<CampusInvite[] | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user && user.user_type === "student") router.replace("/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "recruiter" || !user.is_verified) return;
    fetchMyCampusInvites(accessToken)
      .then(setInvites)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load your invites."));
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

  if (status === "loading" || !user || user.user_type !== "recruiter" || invites === null) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const pending = invites.filter((i) => i.status === "pending");
  const accepted = invites.filter((i) => i.status === "accepted");
  const rejected = invites.filter((i) => i.status === "rejected");

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl space-y-8 px-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Cohorts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cohorts that invited {user.company_name}. Open one to see its students and run tests.
          </p>
        </div>

        <section className="animate-fade-up space-y-2" style={{ animationDelay: "60ms" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            Invitations
            {pending.length > 0 ? <Badge className="h-5 min-w-5 px-1.5">{pending.length}</Badge> : null}
          </h2>
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
        </section>

        <section className="animate-fade-up space-y-2" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-semibold">Your cohorts</h2>
          {accepted.length === 0 ? (
            <EmptyState icon={Users}>Cohorts whose invitation you accept will show up here.</EmptyState>
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
        </section>

        {rejected.length > 0 ? (
          <section className="animate-fade-up space-y-2" style={{ animationDelay: "180ms" }}>
            <h2 className="text-sm font-semibold text-muted-foreground">Declined</h2>
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
          </section>
        ) : null}
      </div>
    </div>
  );
}
