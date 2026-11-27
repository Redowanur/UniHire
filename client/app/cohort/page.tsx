"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  Check,
  Copy,
  Link2,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PlacementBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import {
  createInviteLink,
  fetchCohort,
  fetchInviteLinks,
  renameCohort,
  revokeInviteLink,
  type CohortDetail,
  type InviteLink,
} from "@/lib/api";

const expiryItems = [
  { value: "never", label: "Never expires" },
  { value: "1", label: "In 1 hour" },
  { value: "24", label: "In 24 hours" },
  { value: "168", label: "In 7 days" },
  { value: "custom", label: "Pick a date…" },
];

function EmptyState({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      <span className="grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5" />
      </span>
      <p className="max-w-sm">{children}</p>
    </div>
  );
}

export default function CohortDashboardPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [expiry, setExpiry] = useState("never");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  // Ticks so a link that expires while the page is open disappears without a reload
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const liveLinks = links.filter((l) => !l.expires_at || now === 0 || new Date(l.expires_at).getTime() > now);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user && user.user_type === "recruiter") router.replace("/recruiter/cohorts");
    else if (user && user.user_type === "student" && !user.cohort_id) router.replace("/onboarding/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || !user?.cohort_id) return;
    Promise.all([
      fetchCohort(user.cohort_id, accessToken),
      fetchInviteLinks(user.cohort_id, accessToken),
    ])
      .then(([c, l]) => {
        setCohort(c);
        setLinks(l);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't load your cohort.");
        setLoadFailed(true);
      });
  }, [accessToken, user?.cohort_id]);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !cohort) return;
    const name = nameDraft.trim();
    if (name === cohort.name) {
      setRenaming(false);
      return;
    }
    setSavingName(true);
    try {
      const updated = await renameCohort(cohort.id, name, accessToken);
      setCohort((current) => (current ? { ...current, name: updated.name } : current));
      setRenaming(false);
      toast.success("Cohort renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't rename the cohort.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleCreateLink(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !user?.cohort_id) return;
    setCreatingLink(true);
    try {
      let hours: number | null = null;
      if (expiry === "custom") {
        if (!expiryDate) {
          toast.error("Pick an expiry date first.");
          setCreatingLink(false);
          return;
        }
        const end = new Date(expiryDate);
        end.setHours(23, 59, 0, 0);
        hours = Math.max(1, Math.ceil((end.getTime() - Date.now()) / 3_600_000));
      } else if (expiry !== "never") {
        hours = Number(expiry);
      }
      const link = await createInviteLink(user.cohort_id, hours, accessToken);
      setLinks((current) => [link, ...current]);
      toast.success("Invite link created");
      setExpiry("never");
      setExpiryDate(undefined);
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
      setLinks((current) => current.filter((l) => l.token !== token));
      toast.success("Link revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't revoke that link.");
    }
  }

  function handleCopy(token: string) {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedToken(token);
      toast.success("Link copied");
      setTimeout(() => setCopiedToken(null), 1500);
    });
  }

  if (loadFailed) {
    return (
      <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">
        Couldn&apos;t load your cohort. Please refresh to try again.
      </p>
    );
  }

  if (status === "loading" || !user || (user.user_type === "student" && !user.cohort_id) || !cohort) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <Card className="animate-fade-up overflow-hidden">
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {renaming ? (
                  <form onSubmit={handleRename} className="flex items-center gap-2">
                    <Input
                      autoFocus
                      required
                      minLength={2}
                      maxLength={100}
                      aria-label="Cohort name"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className="h-10 min-w-0 text-lg font-semibold sm:w-80"
                    />
                    <Button type="submit" size="icon" disabled={savingName} aria-label="Save name">
                      {savingName ? <Spinner /> : <Check />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setRenaming(false)}
                      aria-label="Cancel renaming"
                    >
                      <X />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight">{cohort.name}</h1>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Rename cohort"
                      onClick={() => {
                        setNameDraft(cohort.name);
                        setRenaming(true);
                      }}
                    >
                      <Pencil />
                    </Button>
                  </div>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year}
                </p>
              </div>
              <Badge variant="secondary" className="h-7 gap-1.5 px-3">
                <Users />
                {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
              </Badge>
            </div>
            {cohort.description ? (
              <p className="mt-3 text-sm text-muted-foreground">{cohort.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          <div className="space-y-8">
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Members</h2>
              <Card className="py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Student</TableHead>
                      <TableHead className="hidden sm:table-cell">Reg. no.</TableHead>
                      <TableHead className="pr-4 text-right">Placement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cohort.members ?? []).map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="py-3 pl-4 font-medium">
                          {member.name}
                          {member.id === user.id ? (
                            <span className="ml-1.5 text-muted-foreground">(you)</span>
                          ) : null}
                          <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                            Reg. {member.reg_no}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {member.reg_no}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <PlacementBadge status={member.placement_status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Invite links</h2>
              <Card>
                <CardContent>
                  <form
                    onSubmit={handleCreateLink}
                    className="flex flex-col gap-3 sm:flex-row sm:items-start"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="text-sm font-semibold">Link expiry</p>
                      <Select value={expiry} onValueChange={(v) => setExpiry(v ?? "never")} items={expiryItems}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expiryItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {expiry === "custom" ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <p className="text-sm font-semibold">Expiry date</p>
                      <Popover>
                        <PopoverTrigger
                          render={<Button variant="outline" className="h-10 w-full justify-start gap-2 font-normal" />}
                        >
                          <CalendarIcon />
                          {expiryDate ? expiryDate.toLocaleDateString() : "Select date"}
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={expiryDate}
                            onSelect={setExpiryDate}
                            disabled={{ before: new Date() }}
                          />
                        </PopoverContent>
                      </Popover>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-1.5">
                      {/* Same label row as the other fields, so every control sits on one line */}
                      <span aria-hidden className="invisible hidden text-sm font-semibold sm:block">
                        &nbsp;
                      </span>
                      <Button type="submit" disabled={creatingLink} className="h-10 w-full gap-2 sm:w-auto">
                        {creatingLink ? <Spinner /> : <Plus />}
                        New link
                      </Button>
                    </div>
                  </form>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Anyone with the link can join your cohort until it expires or you revoke it.
                  </p>
                </CardContent>
              </Card>

              {liveLinks.length === 0 ? (
                <EmptyState icon={Link2}>No invite links yet. Create one to bring classmates in.</EmptyState>
              ) : (
                <ul className="space-y-2">
                  {liveLinks.map((link) => (
                    <li
                      key={link.token}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">/join/{link.token}</p>
                        <p className="text-xs text-muted-foreground">
                          {link.is_active
                            ? link.expires_at
                              ? `Expires ${new Date(link.expires_at).toLocaleString()}`
                              : "Never expires"
                            : "Revoked"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button variant="outline" size="sm" onClick={() => handleCopy(link.token)} />
                            }
                          >
                            {copiedToken === link.token ? <Check /> : <Copy />}
                            {copiedToken === link.token ? "Copied" : "Copy"}
                          </TooltipTrigger>
                          <TooltipContent>Copy the shareable join link</TooltipContent>
                        </Tooltip>
                        {link.is_active ? (
                          <Button variant="destructive" size="sm" onClick={() => handleRevoke(link.token)}>
                            <X /> Revoke
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
