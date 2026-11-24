"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarIcon,
  Check,
  Copy,
  FileText,
  Link2,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { InviteStatusBadge, PlacementBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [invites, setInvites] = useState<CampusInvite[]>([]);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [tests, setTests] = useState<ScreeningTestSummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [expiry, setExpiry] = useState("never");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
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
      setLinks((current) => current.map((l) => (l.token === token ? { ...l, is_active: false } : l)));
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
                <h1 className="text-2xl font-semibold tracking-tight">{cohort.name}</h1>
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
          <Tabs defaultValue="overview">
            <ScrollArea className="w-full">
              <TabsList aria-label="Cohort sections" className="group-data-horizontal/tabs:h-11">
                <TabsTrigger value="overview" className="px-4">Overview</TabsTrigger>
                <TabsTrigger value="companies" className="px-4">Companies</TabsTrigger>
                <TabsTrigger value="tests" className="px-4">Tests</TabsTrigger>
                <TabsTrigger value="links" className="px-4">Invite links</TabsTrigger>
              </TabsList>
            </ScrollArea>

            <TabsContent value="overview" className="animate-overlay-in mt-2">
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
            </TabsContent>

            <TabsContent value="companies" className="animate-overlay-in mt-2">
              {invites.length === 0 ? (
                <EmptyState icon={Building2}>
                  No companies invited yet. Head to{" "}
                  <Link href="/hiring" className="font-semibold text-primary">
                    who&apos;s hiring
                  </Link>{" "}
                  to send your first invite.
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {invites.map((invite) => (
                    <li key={invite.id} className="rounded-xl border bg-card px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{invite.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.job_title ?? "General outreach"} · invited by{" "}
                            {invite.invited_by === user.id ? "you" : "a cohort member"}
                          </p>
                        </div>
                        <InviteStatusBadge status={invite.status} />
                      </div>
                      {invite.message ? (
                        <p className="mt-2 text-xs text-muted-foreground">&ldquo;{invite.message}&rdquo;</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="tests" className="animate-overlay-in mt-2">
              {tests.length === 0 ? (
                <EmptyState icon={FileText}>
                  No screening tests yet. They&apos;ll show up here once a recruiter you invited
                  publishes one.
                </EmptyState>
              ) : (
                <ul className="space-y-2">
                  {tests.map((test) => (
                    <li key={test.id}>
                      <Link
                        href={`/tests/${test.id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{test.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {test.company_name} · {test.question_count} questions
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="links" className="animate-overlay-in mt-2">
              <Card>
                <CardContent>
                  <form
                    onSubmit={handleCreateLink}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold">Link expiry</p>
                      <Select value={expiry} onValueChange={(v) => setExpiry(v ?? "never")} items={expiryItems}>
                        <SelectTrigger className="w-full">
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
                      <div className="min-w-0 space-y-1.5">
                        <p className="text-sm font-semibold">Expiry date</p>
                      <Popover>
                        <PopoverTrigger
                          render={<Button variant="outline" className="w-full justify-start gap-2 font-normal lg:w-48" />}
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
                    <Button type="submit" disabled={creatingLink} className="w-full gap-2 sm:col-span-full lg:col-span-1 lg:w-auto">
                      {creatingLink ? <Spinner /> : <Plus />}
                      New link
                    </Button>
                  </form>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Anyone with the link can join your cohort until it expires or you revoke it.
                  </p>
                </CardContent>
              </Card>

              {links.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon={Link2}>No invite links yet. Create one to bring classmates in.</EmptyState>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {links.map((link) => (
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
