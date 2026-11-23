"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, LoaderCircle, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  createInviteLink,
  fetchCohort,
  fetchInviteLinks,
  fetchMyCampusInvites,
  fetchScreeningTests,
  revokeInviteLink,
  type CampusInvite,
  type CohortDetail,
  type InviteLink,
  type ScreeningTestSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const placementTone: Record<string, string> = {
  not_placed: "bg-surface text-body",
  in_process: "bg-primary-50 text-primary-600",
  interview: "bg-accent-50 text-accent-700",
  placed: "bg-emerald-50 text-emerald-600",
};

const placementLabel: Record<string, string> = {
  not_placed: "Not placed",
  in_process: "In process",
  interview: "Interviewing",
  placed: "Placed",
};

const inviteTone: Record<CampusInvite["status"], string> = {
  pending: "bg-accent-50 text-accent-700",
  accepted: "bg-emerald-50 text-emerald-600",
  rejected: "bg-red-50 text-red-500",
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      {children}
    </span>
  );
}

export default function CohortDashboardPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [invites, setInvites] = useState<CampusInvite[]>([]);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [tests, setTests] = useState<ScreeningTestSummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [expiresHours, setExpiresHours] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user && user.user_type === "recruiter") router.replace("/recruiter/dashboard");
    else if (user && user.user_type === "student" && !user.cohort_id) router.replace("/onboarding/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || !user?.cohort_id) return;
    Promise.all([
      fetchCohort(user.cohort_id, accessToken),
      fetchMyCampusInvites(accessToken),
      fetchInviteLinks(user.cohort_id, accessToken),
      fetchScreeningTests(accessToken, { cohort_id: user.cohort_id }),
    ])
      .then(([c, i, l, t]) => {
        setCohort(c);
        setInvites(i);
        setLinks(l);
        setTests(t);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't load your cohort.");
        setLoadFailed(true);
      });
  }, [accessToken, user?.cohort_id]);

  async function handleCreateLink(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !user?.cohort_id) return;
    setCreatingLink(true);
    try {
      const link = await createInviteLink(
        user.cohort_id,
        expiresHours ? Number(expiresHours) : null,
        accessToken,
      );
      setLinks((current) => [link, ...current]);
      setExpiresHours("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create an invite link.");
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleRevoke(token: string) {
    if (!accessToken) return;
    try {
      await revokeInviteLink(token, accessToken);
      setLinks((current) => current.map((l) => (l.token === token ? { ...l, is_active: false } : l)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't revoke that link.");
    }
  }

  function handleCopy(token: string) {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 1500);
    });
  }

  if (status === "loading" || !user || (user.user_type === "student" && !user.cohort_id)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-body">
        Couldn&apos;t load your cohort. Please refresh to try again.
      </p>
    );
  }

  if (!cohort) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-heading">{cohort.name}</h1>
              <p className="mt-1 text-sm text-body">
                {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600">
              <Users className="size-3.5" />
              {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
            </span>
          </div>
          {cohort.description ? <p className="mt-3 text-sm text-body">{cohort.description}</p> : null}
        </div>

        <div className="mt-6">
          <Tabs defaultValue="overview">
            <TabsList aria-label="Cohort sections">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="tests">Tests</TabsTrigger>
              <TabsTrigger value="links">Invite links</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="animate-overlay-in">
              <ul className="space-y-2">
                {(cohort.members ?? []).map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-heading">
                        {member.name} {member.id === user.id ? <span className="text-muted">(you)</span> : null}
                      </p>
                      <p className="text-xs text-muted">Reg. {member.reg_no}</p>
                    </div>
                    <Pill tone={placementTone[member.placement_status]}>
                      {placementLabel[member.placement_status]}
                    </Pill>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="companies" className="animate-overlay-in">
              {invites.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-body">
                  No companies invited yet. Head to{" "}
                  <Link href="/hiring" className="font-semibold text-primary-600">
                    who&apos;s hiring
                  </Link>{" "}
                  to send your first invite.
                </p>
              ) : (
                <ul className="space-y-2">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="rounded-xl border border-line bg-white px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-heading">{invite.company_name}</p>
                          <p className="text-xs text-muted">
                            {invite.job_title ?? "General outreach"} · invited by{" "}
                            {invite.invited_by === user.id ? "you" : "a cohort member"}
                          </p>
                        </div>
                        <Pill tone={inviteTone[invite.status]}>{invite.status}</Pill>
                      </div>
                      {invite.message ? (
                        <p className="mt-2 text-xs text-body">&ldquo;{invite.message}&rdquo;</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="tests" className="animate-overlay-in">
              {tests.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-body">
                  No screening tests yet. They&apos;ll show up here once a recruiter you invited
                  publishes one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tests.map((test) => (
                    <li key={test.id}>
                      <Link
                        href={`/tests/${test.id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-primary-300"
                      >
                        <div>
                          <p className="text-sm font-semibold text-heading">{test.title}</p>
                          <p className="text-xs text-muted">
                            {test.company_name} · {test.question_count} questions
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-primary-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="links" className="animate-overlay-in">
              <form onSubmit={handleCreateLink} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-heading">Expires in (hours, optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={expiresHours}
                    onChange={(event) => setExpiresHours(event.target.value)}
                    placeholder="Never expires"
                    className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingLink}
                  className="flex h-10 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                  {creatingLink ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  New link
                </button>
              </form>

              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li
                    key={link.token}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-mono text-heading">/join/{link.token}</p>
                      <p className="text-xs text-muted">
                        {link.is_active
                          ? link.expires_at
                            ? `Expires ${new Date(link.expires_at).toLocaleString()}`
                            : "Never expires"
                          : "Revoked"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.token)}
                        className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-heading transition-colors hover:border-primary-400"
                      >
                        {copiedToken === link.token ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copiedToken === link.token ? "Copied" : "Copy"}
                      </button>
                      {link.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(link.token)}
                          className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-red-500 transition-colors hover:border-red-300"
                        >
                          <X className="size-3.5" />
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
