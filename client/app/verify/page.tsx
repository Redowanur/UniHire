"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CircleAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "success"; message: string; alreadyVerified: boolean }
  | { kind: "error"; message: string };

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const token = new URLSearchParams(window.location.search).get("token");

    const result = token
      ? verifyEmail(token)
      : Promise.reject<Awaited<ReturnType<typeof verifyEmail>>>(
          new Error("No verification token found in the link."),
        );

    result
      .then((data) => {
        if (cancelled) return;
        setState({ kind: "success", message: data.message, alreadyVerified: data.already_verified });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-secondary/40 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <Card className="animate-fade-up shadow-xl shadow-primary/5">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            {state.kind === "loading" ? (
              <>
                <Spinner className="size-10 text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your account…</p>
              </>
            ) : state.kind === "success" ? (
              <>
                <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
                  <BadgeCheck className="size-7" />
                </span>
                <h1 className="text-xl font-semibold">
                  {state.alreadyVerified ? "Already verified" : "Email verified"}
                </h1>
                <p className="text-sm text-muted-foreground">{state.message}</p>
                <Link href="/" className={buttonVariants({ size: "lg", className: "mt-2" })}>
                  Go to home
                </Link>
              </>
            ) : (
              <>
                <span className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <CircleAlert className="size-7" />
                </span>
                <h1 className="text-xl font-semibold">Verification failed</h1>
                <p className="text-sm text-muted-foreground">{state.message}</p>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "outline", size: "lg", className: "mt-2" })}
                >
                  Back to login
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
