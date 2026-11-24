"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { createCampusInvite, type JobListing } from "@/lib/api";
import { cn } from "@/lib/utils";

export function InviteToCampusButton({
  job,
  className,
}: {
  job: Pick<JobListing, "id" | "company_name">;
  className?: string;
}) {
  const router = useRouter();
  const { user, status, accessToken, isRecruiter } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (isRecruiter) return null;
  if (status === "loading") return <Skeleton className={cn("h-10 w-36", className)} />;

  if (!user) {
    return (
      <Button className={className} onClick={() => router.push("/signup")}>
        Invite to campus
      </Button>
    );
  }

  if (!user.is_verified) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className={cn("inline-flex", className)} tabIndex={0} />}>
          <Button variant="outline" disabled className="w-full">
            Invite to campus
          </Button>
        </TooltipTrigger>
        <TooltipContent>Verify your email first</TooltipContent>
      </Tooltip>
    );
  }

  if (!user.cohort_id) {
    return (
      <Button variant="outline" className={className} onClick={() => router.push("/onboarding/cohort")}>
        Join a cohort to invite
      </Button>
    );
  }

  async function handleSend() {
    if (!accessToken) return;
    setSending(true);
    try {
      await createCampusInvite({ job_id: job.id, message: message.trim() || undefined }, accessToken);
      setSent(true);
      setOpen(false);
      toast.success(`Invite sent to ${job.company_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the invite. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Button variant="secondary" disabled className={cn("gap-1.5", className)}>
        <CheckCircle2 /> Invite sent
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button className={className} />}>Invite to campus</PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-4">
        <PopoverHeader>
          <PopoverTitle>Invite {job.company_name} to your campus</PopoverTitle>
          <PopoverDescription>
            They&apos;ll see this on their dashboard and can accept or decline.
          </PopoverDescription>
        </PopoverHeader>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Optional note (e.g. why your cohort is a great fit)"
          rows={3}
          maxLength={1000}
        />
        <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
          {sending ? <Spinner /> : <Send />}
          Send invite
        </Button>
      </PopoverContent>
    </Popover>
  );
}
