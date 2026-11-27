"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { fetchScreeningTests, formatExamTime, type ScreeningTestSummary } from "@/lib/api";

export default function CohortTestsPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();
  const [tests, setTests] = useState<ScreeningTestSummary[] | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user?.user_type === "recruiter") router.replace("/recruiter/cohorts");
    else if (user?.user_type === "student" && !user.cohort_id) router.replace("/onboarding/cohort");
  }, [status, user, router]);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "student" || !user.cohort_id) return;
    fetchScreeningTests(accessToken, { cohort_id: user.cohort_id })
      .then(setTests)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't load tests."));
  }, [accessToken, user]);

  if (!user || user.user_type !== "student" || tests === null) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Screening tests recruiters have scheduled for your cohort.
          </p>
        </div>

        <div className="animate-fade-up mt-6" style={{ animationDelay: "100ms" }}>
          {tests.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              <span className="grid size-11 place-items-center rounded-full bg-muted">
                <FileText className="size-5" />
              </span>
              <p className="max-w-sm">
                No screening tests yet. They&apos;ll show up here once a recruiter you invited publishes one.
              </p>
            </div>
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
                        {test.company_name} · {test.question_count} questions · {formatExamTime(test.start_time)} ·{" "}
                        {test.duration_minutes} min
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
