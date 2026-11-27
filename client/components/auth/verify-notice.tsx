"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { sendVerificationEmail } from "@/lib/api";

export function VerifyNotice({
  email,
  accessToken,
  onCheck,
  afterVerified,
}: {
  email: string;
  accessToken: string | null;
  onCheck: () => Promise<unknown>;
  /** Finishes the sentence "…then come back here to ___". */
  afterVerified: string;
}) {
  const [busy, setBusy] = useState<"resend" | "check" | null>(null);

  // Verifying in another tab: re-check when this one regains focus
  useEffect(() => {
    const onFocus = () => void onCheck();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [onCheck]);

  async function resend() {
    setBusy("resend");
    try {
      if (accessToken) await sendVerificationEmail(accessToken);
      toast.success("Verification link sent. Check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the email.");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy("check");
    try {
      await onCheck();
      toast.info("Not verified yet. Click the link in your email first.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-secondary/40 px-4 py-16">
      <Card className="mx-auto max-w-md animate-fade-up text-center shadow-xl shadow-primary/5">
        <CardContent className="flex flex-col items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary">
            <MailCheck className="size-7" />
          </span>
          <h1 className="text-xl font-semibold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <span className="font-semibold text-foreground">{email}</span>. Click it to verify your
            account, then come back here to {afterVerified}.
          </p>
          <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
            <Button className="flex-1 gap-2" disabled={busy !== null} onClick={check}>
              {busy === "check" ? <Spinner /> : null}
              I&apos;ve verified
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              disabled={busy !== null}
              onClick={resend}
            >
              {busy === "resend" ? <Spinner /> : null}
              Resend link
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
