"use client";

import { Suspense, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Link2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { joinViaInviteLink, previewInviteLink, type InviteLinkPreview } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ready"; preview: InviteLinkPreview }
  | { kind: "error"; message: string };

function JoinCohortPageContent() {
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
    <div className="bg-secondary/40 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <Card className="animate-fade-up shadow-xl shadow-primary/5">
          <CardContent className="text-center">
            {state.kind === "loading" ? (
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : state.kind === "error" ? (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-7" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">Invite not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
              </>
            ) : (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
                  <Link2 className="size-7" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">{state.preview.cohort_name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {state.preview.university_name} · {state.preview.dept_name} · Batch{" "}
                  {state.preview.batch_year}
                </p>
                <Badge variant="secondary" className="mt-3">
                  {state.preview.member_count} member{state.preview.member_count === 1 ? "" : "s"}
                </Badge>

                <div className="mt-6">
                  {!state.preview.is_joinable ? (
                    <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                      This invite link is no longer active.
                    </p>
                  ) : status === "loading" ? (
                    <Skeleton className="h-12 w-full" />
                  ) : !user ? (
                    <NextLink
                      href={`/signup?next=/join/${params.token}`}
                      className={buttonVariants({ size: "lg", className: "w-full" })}
                    >
                      Sign up to join
                    </NextLink>
                  ) : user.user_type !== "student" ? (
                    <p className="text-sm text-muted-foreground">Only students can join a cohort.</p>
                  ) : !user.is_verified ? (
                    <p className="text-sm text-muted-foreground">
                      Verify your email before joining a cohort.
                    </p>
                  ) : user.cohort_id ? (
                    <p className="text-sm text-muted-foreground">You&apos;re already part of a cohort.</p>
                  ) : (
                    <Button size="lg" disabled={joining} onClick={handleJoin} className="w-full gap-2">
                      {joining ? <Spinner /> : null}
                      Join this cohort
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function JoinCohortPage() {
  return (
    <Suspense fallback={null}>
      <JoinCohortPageContent />
    </Suspense>
  );
}
