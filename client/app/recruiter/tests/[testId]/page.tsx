"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Inbox, Star } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/use-auth";
import {
  fetchScreeningTest,
  fetchSubmissions,
  toggleShortlist,
  type ScreeningTestDetail,
  type SubmissionRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function RecruiterTestSubmissionsPageContent() {
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
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Couldn't load this test.";
        toast.error(message);
        setError(message);
      });
  }, [accessToken, user?.user_type, params.testId]);

  async function handleToggle(row: SubmissionRow) {
    if (!accessToken) return;
    setPendingId(row.student_id);
    try {
      const updated = await toggleShortlist(params.testId, row.student_id, !row.shortlisted, accessToken);
      setRows((current) => current?.map((r) => (r.student_id === updated.student_id ? updated : r)) ?? null);
      toast.success(updated.shortlisted ? `${row.student_name} shortlisted` : `${row.student_name} removed from shortlist`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update shortlist status.");
    } finally {
      setPendingId(null);
    }
  }

  if (error) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">{error}</p>;
  }

  if (status === "loading" || !user || !test || rows === null) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-12">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
          {test.description ? <p className="mt-1 text-sm text-muted-foreground">{test.description}</p> : null}
          <Badge variant="secondary" className="mt-3">
            {test.questions.length} questions
          </Badge>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            <span className="grid size-11 place-items-center rounded-full bg-muted">
              <Inbox className="size-5" />
            </span>
            No submissions yet.
          </div>
        ) : (
          <Card className="animate-fade-up mt-6 py-0" style={{ animationDelay: "100ms" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="pr-4 text-right">Shortlist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.student_id}>
                    <TableCell className="py-3 pl-4 font-medium">
                      {row.student_name}
                      <span className="block text-xs font-normal text-muted-foreground">
                        Reg. {row.reg_no}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="tabular-nums">
                        {row.score}/{row.total}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        size="sm"
                        variant={row.shortlisted ? "default" : "outline"}
                        disabled={pendingId === row.student_id}
                        onClick={() => handleToggle(row)}
                        className="gap-1.5"
                      >
                        {pendingId === row.student_id ? (
                          <Spinner />
                        ) : (
                          <Star className={cn(row.shortlisted && "fill-current")} />
                        )}
                        {row.shortlisted ? "Shortlisted" : "Shortlist"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RecruiterTestSubmissionsPage() {
  return (
    <Suspense fallback={null}>
      <RecruiterTestSubmissionsPageContent />
    </Suspense>
  );
}
