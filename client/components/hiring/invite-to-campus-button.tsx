"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createCampusInvite, type JobListing } from "@/lib/api";
import { cn } from "@/lib/utils";

export function InviteToCampusButton({
  job,
  className,
}: {
  job: JobListing;
  className?: string;
}) {
  const router = useRouter();
  const { user, status, accessToken, isRecruiter } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  if (isRecruiter) return null;
  if (status === "loading") {
    return <div className={cn("h-10 w-36 animate-pulse rounded-full bg-surface", className)} />;
  }

  if (!user) {
    return (
      <Button
        type="button"
        size="sm"
        className={className}
        onClick={() => router.push("/signup")}
      >
        Invite to campus
      </Button>
    );
  }

  if (!user.is_verified) {
    return (
      <div className={cn("text-right", className)}>
        <Button type="button" size="sm" variant="outline" disabled>
          Invite to campus
        </Button>
        <p className="mt-1.5 text-[11px] text-muted">Verify your email first</p>
      </div>
    );
  }

  if (!user.cohort_id) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        onClick={() => router.push("/onboarding/cohort")}
      >
        Join a cohort to invite
      </Button>
    );
  }

  async function handleSend() {
    if (!accessToken) return;
    setSending(true);
    setError(null);
    try {
      await createCampusInvite({ job_id: job.id, message: message.trim() || undefined }, accessToken);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invite. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <Button type="button" size="sm" onClick={() => setOpen((v) => !v)}>
        {sent ? "Invite sent" : "Invite to campus"}
      </Button>

      {open && !sent ? (
        <div className="animate-overlay-in absolute right-0 top-[calc(100%+10px)] z-30 w-72 rounded-2xl border border-line bg-white p-4 text-left shadow-2xl shadow-night-950/15">
          <p className="text-sm font-semibold text-heading">
            Invite {job.company_name} to your campus
          </p>
          <p className="mt-1 text-xs text-body">
            They&apos;ll see this on their dashboard and can accept or decline.
          </p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Optional note (e.g. why your cohort is a great fit)"
            rows={3}
            maxLength={1000}
            className="mt-3 w-full resize-none rounded-xl border border-line bg-white p-2.5 text-xs text-heading outline-none placeholder:text-muted focus:border-primary-400"
          />
          {error ? <p className="mt-2 text-xs font-medium text-red-500">{error}</p> : null}
          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary-500 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
          >
            {sending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Send invite
          </button>
        </div>
      ) : null}

      {sent ? (
        <p className="absolute right-0 top-[calc(100%+6px)] flex items-center gap-1 text-[11px] font-medium text-primary-600">
          <CheckCircle2 className="size-3.5" />
          On its way
        </p>
      ) : null}
    </div>
  );
}
