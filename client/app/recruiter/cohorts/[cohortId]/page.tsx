"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ClipboardList, Lock, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { PlacementBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { AiQuestionGenerator } from "@/components/recruiter/ai-question-generator";
import { QuestionEditor } from "@/components/recruiter/question-editor";
import { useAuth } from "@/hooks/use-auth";
import {
  createScreeningTest,
  fetchScreeningTest,
  updateScreeningTest,
  type QuestionFull,
  type ScreeningTestDetail,
  formatExamTime,
  fetchCohort,
  fetchMyCampusInvites,
  fetchScreeningTests,
  type CampusInvite,
  type CohortDetail,
  type QuestionDraft,
  type ScreeningTestSummary,
} from "@/lib/api";

/** ISO timestamp -> the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyQuestion(): QuestionDraft {
  return { text: "", options: ["", "", "", ""], correct_index: 0, code: null, language: null };
}

/** True for the untouched starter question, which AI-generated questions replace instead of following. */
function isBlank(q: QuestionDraft): boolean {
  return !q.text.trim() && !(q.code ?? "").trim() && q.options.every((o) => !o.trim());
}

/** The shape the API wants. Code keeps its indentation; only blank lines at the ends go. */
function toPayload(q: QuestionDraft): QuestionDraft {
  const code = (q.code ?? "").replace(/^\s*\n/, "").trimEnd();
  return {
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()).filter(Boolean),
    correct_index: q.correct_index,
    code: code || null,
    language: code ? (q.language ?? "plaintext") : null,
  };
}

function RecruiterCohortPageContent() {
  const params = useParams<{ cohortId: string }>();
  const searchParams = useSearchParams();
  // Snapshot used to hide Edit on exams that have already closed
  const [pageOpenedAt] = useState(() => Date.now());
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [invite, setInvite] = useState<CampusInvite | null>(null);
  const [tests, setTests] = useState<ScreeningTestSummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const [showForm, setShowForm] = useState(false);
  // The test being edited, or null when the form creates a new one
  const [editing, setEditing] = useState<ScreeningTestDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [creating, setCreating] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState("30");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user && user.user_type === "student") router.replace("/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "recruiter") return;
    Promise.all([
      fetchCohort(params.cohortId, accessToken),
      fetchMyCampusInvites(accessToken),
      fetchScreeningTests(accessToken, { cohort_id: params.cohortId }),
    ])
      .then(([c, invites, t]) => {
        setCohort(c);
        setInvite(invites.find((i) => i.cohort_id === params.cohortId) ?? null);
        setTests(t);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Couldn't load this cohort.");
        setLoadFailed(true);
      });
  }, [accessToken, user?.user_type, params.cohortId]);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartAt("");
    setDuration("30");
    setQuestions([emptyQuestion()]);
  }

  function openNew() {
    setEditing(null);
    resetForm();
    setShowForm(true);
  }

  const openEdit = useCallback(
    async (testId: string) => {
      if (!accessToken) return;
      try {
        const detail = await fetchScreeningTest(testId, accessToken);
        setEditing(detail);
        setTitle(detail.title);
        setDescription(detail.description ?? "");
        setStartAt(toLocalInput(detail.start_time));
        setDuration(String(detail.duration_minutes));
        setQuestions(
          (detail.questions as QuestionFull[]).map((q) => ({
            text: q.text,
            options: q.options,
            correct_index: q.correct_index,
            code: q.code ?? null,
            language: q.language ?? null,
          })),
        );
        setShowForm(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't open this test.");
      }
    },
    [accessToken],
  );

  // Deep link from the results page: /recruiter/cohorts/<id>?edit=<testId>
  const editParam = searchParams.get("edit");
  const handledEdit = useRef<string | null>(null);
  useEffect(() => {
    if (editParam && cohort && handledEdit.current !== editParam) {
      handledEdit.current = editParam;
      void openEdit(editParam);
    }
  }, [editParam, cohort, openEdit]);

  async function handleSaveEdit() {
    if (!accessToken || !editing) return;
    setCreating(true);
    try {
      const locked = editing.attempt_count > 0;
      const updated = await updateScreeningTest(
        editing.id,
        {
          title: title.trim(),
          description: description.trim(),
          start_time: new Date(startAt).toISOString(),
          duration_minutes: Number(duration),
          ...(locked
            ? {}
            : {
                questions: questions.map(toPayload),
              }),
        },
        accessToken,
      );
      setTests((current) =>
        current.map((t) =>
          t.id === updated.id
            ? {
                ...t,
                title: updated.title,
                description: updated.description,
                question_count: locked ? t.question_count : updated.questions.length,
                start_time: updated.start_time,
                duration_minutes: updated.duration_minutes,
                ends_at: updated.ends_at,
              }
            : t,
        ),
      );
      setShowForm(false);
      setEditing(null);
      toast.success("Test updated. The cohort is being emailed the new details.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your changes.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateTest(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startAt)) {
      toast.error("Pick a start date and time.");
      return;
    }
    if (editing) {
      await handleSaveEdit();
      return;
    }
    if (!accessToken || !invite) return;
    setCreating(true);
    try {
      const created = await createScreeningTest(
        {
          campus_invite_id: invite.id,
          title: title.trim(),
          description: description.trim() || undefined,
          start_time: new Date(startAt).toISOString(),
          duration_minutes: Number(duration),
          questions: questions.map(toPayload),
        },
        accessToken,
      );
      setTests((current) => [
        {
          id: created.id,
          campus_invite_id: created.campus_invite_id,
          cohort_id: created.cohort_id,
          recruiter_id: created.recruiter_id,
          company_name: user?.company_name ?? "",
          title: created.title,
          description: created.description,
          question_count: created.questions.length,
          start_time: created.start_time,
          duration_minutes: created.duration_minutes,
          ends_at: created.ends_at,
          created_at: created.created_at,
        },
        ...current,
      ]);
      setShowForm(false);
      toast.success("Test scheduled. The cohort is being emailed the details.");
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create this test.");
    } finally {
      setCreating(false);
    }
  }

  if (loadFailed) {
    return (
      <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">
        Couldn&apos;t load this cohort. Please refresh to try again.
      </p>
    );
  }

  if (status === "loading" || !user || !cohort) {
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
        <Breadcrumb className="mb-5">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/recruiter/cohorts">Cohorts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[50vw] truncate">{cohort.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card className="animate-fade-up">
          <CardContent>
            <h1 className="text-2xl font-semibold tracking-tight">{cohort.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year}
            </p>
            <Badge variant="secondary" className="mt-3">
              {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
            </Badge>
          </CardContent>
        </Card>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          <Tabs defaultValue="roster">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="group-data-horizontal/tabs:h-11">
                <TabsTrigger value="roster" className="px-4">Roster</TabsTrigger>
                <TabsTrigger value="tests" className="px-4">Screening tests</TabsTrigger>
              </TabsList>
              {invite ? (
                <Button onClick={openNew} className="gap-2">
                  <Plus /> New test
                </Button>
              ) : null}
            </div>

            <TabsContent value="roster" className="animate-overlay-in mt-2">
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

            <TabsContent value="tests" className="animate-overlay-in mt-2">
              {tests.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
                  <span className="grid size-11 place-items-center rounded-full bg-muted">
                    <ClipboardList className="size-5" />
                  </span>
                  No screening tests yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {tests.map((test) => (
                    <li key={test.id} className="flex items-stretch gap-2">
                      <Link
                        href={`/recruiter/tests/${test.id}`}
                        className="group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{test.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {test.question_count} questions · {formatExamTime(test.start_time)} · {test.duration_minutes} min
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </Link>
                      {new Date(test.ends_at).getTime() > pageOpenedAt ? (
                        <Button
                          variant="outline"
                          className="h-auto gap-1.5 rounded-xl"
                          onClick={() => void openEdit(test.id)}
                          aria-label={`Edit ${test.title}`}
                        >
                          <Pencil /> Edit
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-5">
            <DialogTitle>{editing ? "Edit screening test" : "New screening test"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes to the schedule or questions are emailed to the cohort."
                : "Pick the correct option for each question."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTest} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <Input
                required
                placeholder="Test title (e.g. Aptitude screen)"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />

              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="test-start">Start time</Label>
                  <DateTimePicker
                    id="test-start"
                    disabled={editing?.phase === "live"}
                    value={startAt}
                    onChange={setStartAt}
                    minDate={new Date(pageOpenedAt)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="test-duration">Duration (min)</Label>
                  <Input
                    id="test-duration"
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Students can only sit the exam between the start time and start + duration.{" "}
                {editing?.phase === "live"
                  ? "The exam is running, so the start time is fixed; you can still change the duration."
                  : "Everyone in the cohort is emailed the details when you publish."}
              </p>

              {editing && editing.attempt_count > 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {editing.attempt_count} student{editing.attempt_count === 1 ? " has" : "s have"} already
                    opened this exam, so its questions are locked. You can still change the title,
                    description and schedule.
                  </p>
                </div>
              ) : (
                <>
              {accessToken ? (
                <AiQuestionGenerator
                  accessToken={accessToken}
                  onGenerated={(generated) =>
                    setQuestions((current) => {
                      const kept = current.filter((q) => !isBlank(q));
                      return [...kept, ...generated.map((q) => ({ ...emptyQuestion(), ...q }))];
                    })
                  }
                />
              ) : null}

              {questions.map((question, qIndex) => (
                <QuestionEditor
                  key={qIndex}
                  index={qIndex}
                  question={question}
                  canRemove={questions.length > 1}
                  onChange={(patch) => updateQuestion(qIndex, patch)}
                  onRemove={() => setQuestions((current) => current.filter((_, i) => i !== qIndex))}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
              >
                <Plus /> Add question
              </Button>
                </>
              )}
            </div>
            <DialogFooter className="m-0 rounded-none border-t p-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? <Spinner /> : null}
                {editing ? "Save changes" : "Publish test"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RecruiterCohortPage() {
  return (
    <Suspense fallback={null}>
      <RecruiterCohortPageContent />
    </Suspense>
  );
}
