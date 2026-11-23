"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle, Star } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  fetchScreeningTest,
  fetchSubmissions,
  toggleShortlist,
  type ScreeningTestDetail,
  type SubmissionRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RecruiterTestSubmissionsPage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [test, setTest] = useState<ScreeningTestDetail | null>(null);
  const [rows, setRows] = useState<SubmissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user && user.user_type === "student") router.replace("/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "recruiter") return;
    Promise.all([fetchScreeningTest(params.testId, accessToken), fetchSubmissions(params.testId, accessToken)])
      .then(([t, s]) => {
        setTest(t);
        setRows(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this test."));
  }, [accessToken, user?.user_type, params.testId]);

  async function handleToggle(row: SubmissionRow) {
    if (!accessToken) return;
    setPendingId(row.student_id);
    try {
      const updated = await toggleShortlist(params.testId, row.student_id, !row.shortlisted, accessToken);
      setRows((current) => current?.map((r) => (r.student_id === updated.student_id ? updated : r)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update shortlist status.");
    } finally {
      setPendingId(null);
    }
  }

  if (status === "loading" || !user || !test || rows === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-body">{error}</p>;
  }

  return (
    <div className="bg-surface/60 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl px-4">
        <h1 className="font-display text-2xl font-bold text-heading">{test.title}</h1>
        {test.description ? <p className="mt-1 text-sm text-body">{test.description}</p> : null}
        <p className="mt-1 text-xs text-muted">{test.questions.length} questions</p>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-body">
            No submissions yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {rows.map((row) => (
              <li
                key={row.student_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-heading">{row.student_name}</p>
                  <p className="text-xs text-muted">
                    Reg. {row.reg_no} · Score {row.score}/{row.total}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendingId === row.student_id}
                  onClick={() => handleToggle(row)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition-colors disabled:opacity-60",
                    row.shortlisted
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-line text-heading hover:border-primary-300",
                  )}
                >
                  <Star className={cn("size-3.5", row.shortlisted && "fill-current")} />
                  {row.shortlisted ? "Shortlisted" : "Shortlist"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
