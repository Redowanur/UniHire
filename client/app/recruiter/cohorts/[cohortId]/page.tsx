"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useAuth } from "@/hooks/use-auth";
import {
  createScreeningTest,
  fetchCohort,
  fetchMyCampusInvites,
  fetchScreeningTests,
  type CampusInvite,
  type CohortDetail,
  type QuestionDraft,
  type ScreeningTestSummary,
} from "@/lib/api";

function emptyQuestion(): QuestionDraft {
  return { text: "", options: ["", "", "", ""], correct_index: 0 };
}

function RecruiterCohortPageContent() {
  const params = useParams<{ cohortId: string }>();
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [invite, setInvite] = useState<CampusInvite | null>(null);
  const [tests, setTests] = useState<ScreeningTestSummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [creating, setCreating] = useState(false);

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

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((current) =>
      current.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q,
      ),
    );
  }

  async function handleCreateTest(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !invite) return;
    setCreating(true);
    try {
      const created = await createScreeningTest(
        {
          campus_invite_id: invite.id,
          title: title.trim(),
          description: description.trim() || undefined,
          questions: questions.map((q) => ({
            text: q.text.trim(),
            options: q.options.map((o) => o.trim()).filter(Boolean),
            correct_index: q.correct_index,
          })),
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
          created_at: created.created_at,
        },
        ...current,
      ]);
      setShowForm(false);
      toast.success("Screening test published");
      setTitle("");
      setDescription("");
      setQuestions([emptyQuestion()]);
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
              <BreadcrumbLink href="/recruiter/dashboard">Dashboard</BreadcrumbLink>
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
                <Button onClick={() => setShowForm(true)} className="gap-2">
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
                    <li key={test.id}>
                      <Link
                        href={`/recruiter/tests/${test.id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{test.title}</p>
                          <p className="text-xs text-muted-foreground">{test.question_count} questions</p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-5">
            <DialogTitle>New screening test</DialogTitle>
            <DialogDescription>Pick the correct option for each question.</DialogDescription>
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

              {questions.map((question, qIndex) => (
                <div key={qIndex} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">Question {qIndex + 1}</p>
                    {questions.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive"
                        onClick={() => setQuestions((current) => current.filter((_, i) => i !== qIndex))}
                        aria-label="Remove question"
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                  <Input
                    required
                    placeholder="Question text"
                    value={question.text}
                    onChange={(event) => updateQuestion(qIndex, { text: event.target.value })}
                    className="mt-2"
                  />
                  <RadioGroup
                    value={String(question.correct_index)}
                    onValueChange={(v) => updateQuestion(qIndex, { correct_index: Number(v) })}
                    className="mt-3 gap-2"
                  >
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-3">
                        <RadioGroupItem
                          value={String(oIndex)}
                          id={`q${qIndex}-o${oIndex}`}
                          aria-label={`Mark option ${oIndex + 1} as correct`}
                        />
                        <Label htmlFor={`q${qIndex}-o${oIndex}`} className="sr-only">
                          Option {oIndex + 1}
                        </Label>
                        <Input
                          required
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(event) => updateOption(qIndex, oIndex, event.target.value)}
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
              >
                <Plus /> Add question
              </Button>
            </div>
            <DialogFooter className="m-0 rounded-none border-t p-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? <Spinner /> : null}
                Publish test
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
