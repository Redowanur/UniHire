"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

const placementLabel: Record<string, string> = {
  not_placed: "Not placed",
  in_process: "In process",
  interview: "Interviewing",
  placed: "Placed",
};

function emptyQuestion(): QuestionDraft {
  return { text: "", options: ["", "", "", ""], correct_index: 0 };
}

export default function RecruiterCohortPage() {
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
      setTitle("");
      setDescription("");
      setQuestions([emptyQuestion()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create this test.");
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-body">
        Couldn&apos;t load this cohort. Please refresh to try again.
      </p>
    );
  }

  if (!cohort) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold text-heading">{cohort.name}</h1>
          <p className="mt-1 text-sm text-body">
            {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year} ·{" "}
            {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
          </p>
        </div>

        <section className="mt-6">
          <h2 className="font-display text-lg font-semibold text-heading">Roster</h2>
          <ul className="mt-3 space-y-2">
            {(cohort.members ?? []).map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-heading">{member.name}</p>
                  <p className="text-xs text-muted">Reg. {member.reg_no}</p>
                </div>
                <span className="text-xs font-medium text-body">
                  {placementLabel[member.placement_status]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-heading">Screening tests</h2>
            {invite ? (
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-primary-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
              >
                <Plus className="size-3.5" />
                New test
              </button>
            ) : null}
          </div>

          {tests.length === 0 && !showForm ? (
            <p className="mt-3 rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-body">
              No screening tests yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {tests.map((test) => (
                <li key={test.id}>
                  <Link
                    href={`/recruiter/tests/${test.id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-primary-300"
                  >
                    <div>
                      <p className="text-sm font-semibold text-heading">{test.title}</p>
                      <p className="text-xs text-muted">{test.question_count} questions</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted transition-colors group-hover:text-primary-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {showForm ? (
            <form
              onSubmit={handleCreateTest}
              className="mt-4 flex flex-col gap-4 rounded-2xl border border-line bg-white p-5"
            >
              {createError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                  {createError}
                </p>
              ) : null}

              <input
                required
                placeholder="Test title (e.g. Aptitude screen)"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-xl border border-line px-3.5 text-sm outline-none focus:border-primary-400"
              />
              <textarea
                placeholder="Description (optional)"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="resize-none rounded-xl border border-line p-3 text-sm outline-none focus:border-primary-400"
              />

              {questions.map((question, qIndex) => (
                <div key={qIndex} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted">Question {qIndex + 1}</p>
                    {questions.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setQuestions((current) => current.filter((_, i) => i !== qIndex))}
                        className="text-red-500"
                        aria-label="Remove question"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                  <input
                    required
                    placeholder="Question text"
                    value={question.text}
                    onChange={(event) => updateQuestion(qIndex, { text: event.target.value })}
                    className="mt-2 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                  />
                  <div className="mt-2 space-y-2">
                    {question.options.map((option, oIndex) => (
                      <label key={oIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correct_index === oIndex}
                          onChange={() => updateQuestion(qIndex, { correct_index: oIndex })}
                          className="size-4 accent-primary-500"
                        />
                        <input
                          required
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(event) => updateOption(qIndex, oIndex, event.target.value)}
                          className="h-9 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-primary-400"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
                className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-line text-xs font-semibold text-heading transition-colors hover:border-primary-400"
              >
                <Plus className="size-3.5" />
                Add question
              </button>

              <button
                type="submit"
                disabled={creating}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {creating ? <LoaderCircle className="size-4 animate-spin" /> : null}
                Publish test
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
