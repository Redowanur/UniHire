"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { fetchScreeningTest, submitScreeningTest, type ScreeningTestDetail } from "@/lib/api";

function TakeScreeningTestPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, accessToken } = useAuth();

  const [test, setTest] = useState<ScreeningTestDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
        if (t.already_submitted && t.my_score !== null && t.my_total !== null) {
          setResult({ score: t.my_score, total: t.my_total });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Couldn't load this test.";
        toast.error(message);
        setLoadError(message);
      });
  }, [accessToken, params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !test) return;
    const data = new FormData(event.currentTarget);
    const answers = test.questions.map((_, i) => Number(data.get(`question-${i}`) ?? -1));
    setSubmitting(true);
    try {
      setResult(await submitScreeningTest(test.id, answers, accessToken));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">{loadError}</p>
    );
  }

  if (status === "loading" || !test) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-12">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="bg-secondary/40 px-4 py-16">
        <div className="mx-auto w-full max-w-md">
          <Card className="animate-fade-up text-center shadow-xl shadow-primary/5">
            <CardContent>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-secondary text-primary">
                <CheckCircle2 className="size-7" />
              </span>
              <h1 className="mt-4 text-xl font-semibold">Test submitted</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                You scored <span className="font-semibold text-foreground">{result.score}</span> out of{" "}
                {result.total}.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                The recruiter will review results and may shortlist you from here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 px-4 py-8 md:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="animate-fade-up mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
          {test.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{test.description}</p>
          ) : null}
        </div>

        <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <CardContent>
            <Questionnaire shortcuts="letters" onSubmit={handleSubmit}>
              <QuestionnaireProgress />
              {test.questions.map((question, qIndex) => (
                <QuestionnaireItem key={question.id} name={`question-${qIndex}`} required>
                  <QuestionnaireTitle className="text-lg">
                    {qIndex + 1}. {question.text}
                  </QuestionnaireTitle>
                  <QuestionnaireDescription>Choose one answer.</QuestionnaireDescription>
                  <QuestionnaireChoices>
                    {question.options.map((option, oIndex) => (
                      <QuestionnaireChoice key={oIndex} value={String(oIndex)}>
                        {option}
                      </QuestionnaireChoice>
                    ))}
                  </QuestionnaireChoices>
                  <QuestionnaireError />
                </QuestionnaireItem>
              ))}
              <QuestionnaireActions>
                <QuestionnairePrevious />
                <QuestionnaireNext />
                <QuestionnaireSubmit disabled={submitting}>
                  {submitting ? <Spinner /> : null}
                  Submit answers
                </QuestionnaireSubmit>
              </QuestionnaireActions>
            </Questionnaire>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TakeScreeningTestPage() {
  return (
    <Suspense fallback={null}>
      <TakeScreeningTestPageContent />
    </Suspense>
  );
}
