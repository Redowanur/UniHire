"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { fetchScreeningTest, submitScreeningTest, type ScreeningTestDetail } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function TakeScreeningTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, accessToken } = useAuth();

  const [test, setTest] = useState<ScreeningTestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!accessToken) return;
    fetchScreeningTest(params.id, accessToken)
      .then((t) => {
        setTest(t);
        setAnswers(new Array(t.questions.length).fill(-1));
        if (t.already_submitted && t.my_score !== null && t.my_total !== null) {
          setResult({ score: t.my_score, total: t.my_total });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this test."));
  }, [accessToken, params.id]);

  async function handleSubmit() {
    if (!accessToken || !test) return;
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await submitScreeningTest(test.id, answers, accessToken);
      setResult(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || !test) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error && !test) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-body">{error}</p>;
  }

  if (result) {
    return (
      <div className="bg-surface/60 py-16">
        <div className="mx-auto w-full max-w-md px-4">
          <div className="animate-overlay-in rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-500">
              <CheckCircle2 className="size-7" />
            </span>
            <h1 className="mt-4 font-display text-xl font-bold text-heading">Test submitted</h1>
            <p className="mt-2 text-sm text-body">
              You scored <span className="font-semibold text-heading">{result.score}</span> out of{" "}
              {result.total}.
            </p>
            <p className="mt-3 text-xs text-muted">
              The recruiter will review results and may shortlist you from here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const allAnswered = answers.every((a) => a >= 0);

  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-2xl px-4">
        <h1 className="font-display text-2xl font-bold text-heading">{test.title}</h1>
        {test.description ? <p className="mt-1 text-sm text-body">{test.description}</p> : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {test.questions.map((question, qIndex) => (
            <div key={question.id} className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm font-semibold text-heading">
                {qIndex + 1}. {question.text}
              </p>
              <div className="mt-3 space-y-2">
                {question.options.map((option, oIndex) => (
                  <label
                    key={oIndex}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                      answers[qIndex] === oIndex
                        ? "border-primary-400 bg-primary-50 text-primary-700"
                        : "border-line text-heading hover:border-primary-200",
                    )}
                  >
                    <input
                      type="radio"
                      name={`question-${qIndex}`}
                      checked={answers[qIndex] === oIndex}
                      onChange={() =>
                        setAnswers((current) => current.map((a, i) => (i === qIndex ? oIndex : a)))
                      }
                      className="size-4 accent-primary-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={!allAnswered || submitting}
          onClick={handleSubmit}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Submit answers
        </button>
      </div>
    </div>
  );
}
