import { Badge } from "@/components/ui/badge";
import type { CampusInvite } from "@/lib/api";
import { cn } from "@/lib/utils";

const tone = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  warm: "bg-warm/20 text-[oklch(0.45_0.1_60)]",
  success: "bg-success/15 text-[oklch(0.42_0.12_155)]",
  danger: "bg-destructive/10 text-destructive",
} as const;

export function ToneBadge({
  tone: t,
  children,
  className,
}: {
  tone: keyof typeof tone;
  children: React.ReactNode;
  className?: string;
}) {
  return <Badge className={cn("h-6 px-2.5", tone[t], className)}>{children}</Badge>;
}

const placement: Record<string, { label: string; tone: keyof typeof tone }> = {
  not_placed: { label: "Not placed", tone: "neutral" },
  in_process: { label: "In process", tone: "primary" },
  interview: { label: "Interviewing", tone: "warm" },
  placed: { label: "Placed", tone: "success" },
};

export function PlacementBadge({ status }: { status: string }) {
  const p = placement[status] ?? { label: status, tone: "neutral" as const };
  return <ToneBadge tone={p.tone}>{p.label}</ToneBadge>;
}

const invite: Record<CampusInvite["status"], { label: string; tone: keyof typeof tone }> = {
  pending: { label: "Pending", tone: "warm" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Declined", tone: "danger" },
};

export function InviteStatusBadge({ status }: { status: CampusInvite["status"] }) {
  const i = invite[status];
  return <ToneBadge tone={i.tone}>{i.label}</ToneBadge>;
}
