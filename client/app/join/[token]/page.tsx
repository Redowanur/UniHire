"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle, Link2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { joinViaInviteLink, previewInviteLink, type InviteLinkPreview } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; preview: InviteLinkPreview }
  | { kind: "error"; message: string };

export default function JoinCohortPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, status, accessToken, refreshUser } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    previewInviteLink(params.token)
      .then((preview) => setState({ kind: "ready", preview }))
      .catch((err) =>
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "This invite link doesn't exist.",
        }),
      );
  }, [params.token]);

  async function handleJoin() {
    if (!accessToken) return;
    setJoining(true);
    try {
      await joinViaInviteLink(params.token, accessToken);
      await refreshUser();
      router.push("/cohort");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join this cohort.");
      setJoining(false);
    }
  }

  return (
    <div className="bg-surface/60 py-16">
      <div className="mx-auto w-full max-w-md px-4">
        <div className="animate-overlay-in rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          {state.kind === "loading" ? (
            <>
              <LoaderCircle className="mx-auto size-8 animate-spin text-primary-500" />
              <p className="mt-4 text-sm text-body">Loading invite…</p>
            </>
          ) : state.kind === "error" ? (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500">
                <TriangleAlert className="size-7" />
              </span>
              <h1 className="mt-4 font-display text-xl font-bold text-heading">Invite not found</h1>
              <p className="mt-2 text-sm text-body">{state.message}</p>
            </>
          ) : (
            <>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-500">
                <Link2 className="size-7" />
              </span>
              <h1 className="mt-4 font-display text-xl font-bold text-heading">
                {state.preview.cohort_name}
              </h1>
              <p className="mt-1 text-sm text-body">
                {state.preview.university_name} · {state.preview.dept_name} · Batch{" "}
                {state.preview.batch_year}
              </p>
              <p className="mt-1 text-xs text-muted">
                {state.preview.member_count} member{state.preview.member_count === 1 ? "" : "s"}
              </p>

              {!state.preview.is_joinable ? (
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
                  This invite link is no longer active.
                </p>
              ) : status === "loading" ? (
                <div className="mt-6 h-11" />
              ) : !user ? (
                <NextLink
                  href={`/signup?next=/join/${params.token}`}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Sign up to join
                </NextLink>
              ) : user.user_type !== "student" ? (
                <p className="mt-6 text-sm text-body">Only students can join a cohort.</p>
              ) : !user.is_verified ? (
                <p className="mt-6 text-sm text-body">Verify your email before joining a cohort.</p>
              ) : user.cohort_id ? (
                <p className="mt-6 text-sm text-body">You&apos;re already part of a cohort.</p>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={joining}
                    onClick={handleJoin}
                    className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                  >
                    {joining ? <LoaderCircle className="size-4 animate-spin" /> : null}
                    Join this cohort
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
