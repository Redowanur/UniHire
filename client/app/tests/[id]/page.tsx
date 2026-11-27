"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Clock,
  Monitor,
  ShieldAlert,
  TimerOff,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  fetchScreeningTest,
  formatExamTime,
  reportViolation,
  startScreeningTest,
  submitScreeningTest,
  type QuestionPublic,
  type ScreeningTestDetail,
  type ViolationType,
} from "@/lib/api";
import { LiveBroadcaster } from "@/lib/live";
import { cn } from "cn";

type Result = { score: number; total: number; terminated?: boolean };

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** `screen.isExtended` is Chromium-only; without it we can't tell, so we don't allow the exam. */
function displayState(): { supported: boolean; extended: boolean } {
  const screenInfo = window.screen as Screen & { isExtended?: boolean };
  return { supported: typeof screenInfo.isExtended === "boolean", extended: screenInfo.isExtended === true };
}

const VIOLATION_TEXT: Record<ViolationType, string> = {
  tab_switch: "You left the exam tab or window.",
  multi_monitor: "A second monitor was detected.",
  camera_lost: "Your camera or microphone was turned off.",
  mic_lost: "Your microphone was turned off.",
};

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-secondary/40 px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <Card className="animate-fade-up text-center shadow-xl shadow-primary/5">
          <CardContent className="flex flex-col items-center gap-3">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function Icon({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "danger" }) {
  return (
    <span
      className={cn(
        "grid size-14 place-items-center rounded-full",
        tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-secondary text-primary",
      )}
    >
      {children}
    </span>
  );
}

function TakeScreeningTestPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [test, setTest] = useState<ScreeningTestDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Server clock offset, so a wrong local clock can't extend or shorten the exam
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Pre-exam checks
  const [media, setMedia] = useState<"idle" | "asking" | "ready" | "denied" | "insecure" | "nodevice" | "busy">("idle");
  const [display, setDisplay] = useState<{ supported: boolean; extended: boolean } | null>(null);
  const [starting, setStarting] = useState(false);

  // Exam state
  const [questions, setQuestions] = useState<QuestionPublic[] | null>(null);
  const [endsAt, setEndsAt] = useState(0);
  const [violations, setViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [warning, setWarning] = useState<ViolationType | null>(null);
  const [blocker, setBlocker] = useState<"monitor" | "camera" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewers, setViewers] = useState(0);
  const broadcasterRef = useRef<LiveBroadcaster | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const finishedRef = useRef(false);
  const lastViolationAt = useRef(0);
  const formHostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) el.srcObject = streamRef.current;
  }, []);

  const serverNow = now + offset;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (user?.user_type === "admin") router.replace("/admin");
    else if (user?.user_type === "recruiter") router.replace("/recruiter/cohorts");
  }, [status, user?.user_type, router]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!accessToken || user?.user_type !== "student") return;
    fetchScreeningTest(params.id, accessToken)
      .then((t) => {
        setTest(t);
        setOffset(new Date(t.server_time).getTime() - Date.now());
        if (t.already_submitted && t.my_score !== null && t.my_total !== null) {
          setResult({ score: t.my_score, total: t.my_total });
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Couldn't load this test.";
        toast.error(message);
        setLoadError(message);
      });
  }, [accessToken, user?.user_type, params.id]);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopMedia, [stopMedia]);

  const finish = useCallback(
    async (terminated = false) => {
      if (finishedRef.current || !accessToken || !test) return;
      finishedRef.current = true;
      setSubmitting(true);

      const answers: Record<string, number> = {};
      const form = formHostRef.current?.querySelector("form");
      if (form) {
        const data = new FormData(form);
        for (const [key, value] of data.entries()) {
          if (key.startsWith("q-")) answers[key.slice(2)] = Number(value);
        }
      }

      try {
        const res = await submitScreeningTest(test.id, answers, accessToken);
        setResult({ ...res, terminated });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't submit your answers.");
        setTest((t) => (t ? { ...t, phase: "ended" } : t));
      } finally {
        stopMedia();
        setQuestions(null);
        setSubmitting(false);
      }
    },
    [accessToken, test, stopMedia],
  );

  const flag = useCallback(
    async (type: ViolationType) => {
      if (finishedRef.current || !accessToken || !test) return;
      try {
        const res = await reportViolation(test.id, type, accessToken);
        setViolations(res.violation_count);
        setMaxViolations(res.max_violations);
        if (res.terminated) void finish(true);
        else setWarning(type);
      } catch {
        // The server is the record of truth; a failed report must not break the exam
      }
    },
    [accessToken, test, finish],
  );

  // ---- Proctoring while the exam is open -------------------------------------------------
  const inExam = questions !== null;

  useEffect(() => {
    if (!inExam) return;

    // Leaving the tab fires both visibilitychange and blur; count it once
    function tabLeft() {
      const t = Date.now();
      if (t - lastViolationAt.current < 1500) return;
      lastViolationAt.current = t;
      void flag("tab_switch");
    }
    const onVisibility = () => {
      if (document.hidden) tabLeft();
    };
    const onBlur = () => tabLeft();

    let extended = displayState().extended;
    function checkDisplay() {
      const state = displayState();
      if (state.extended && !extended) void flag("multi_monitor");
      extended = state.extended;
      setBlocker((b) => (state.extended ? "monitor" : b === "monitor" ? null : b));
    }
    const screenInfo = window.screen as unknown as EventTarget;
    screenInfo.addEventListener("change", checkDisplay);
    const displayTimer = window.setInterval(checkDisplay, 2000);
    checkDisplay();

    let cameraLost = false;
    const mediaTimer = window.setInterval(() => {
      const tracks = streamRef.current?.getTracks() ?? [];
      const lost = tracks.length < 2 || tracks.some((t) => t.readyState !== "live" || !t.enabled);
      if (lost && !cameraLost) void flag("camera_lost");
      cameraLost = lost;
      setBlocker((b) => (lost ? "camera" : b === "camera" ? null : b));
    }, 1000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      screenInfo.removeEventListener("change", checkDisplay);
      window.clearInterval(displayTimer);
      window.clearInterval(mediaTimer);
    };
  }, [inExam, flag]);

  // Stream camera + microphone live to the recruiter for as long as the exam is open
  const testId = test?.id;
  useEffect(() => {
    if (!inExam || !accessToken || !testId) return;
    const broadcaster = new LiveBroadcaster(testId, accessToken, () => streamRef.current, setViewers);
    broadcasterRef.current = broadcaster;
    broadcaster.start();
    return () => {
      broadcaster.stop();
      broadcasterRef.current = null;
    };
  }, [inExam, accessToken, testId]);

  // Time's up: submit whatever has been answered
  useEffect(() => {
    if (!inExam) return;
    const id = window.setTimeout(() => void finish(), Math.max(0, endsAt - (Date.now() + offset)));
    return () => window.clearTimeout(id);
  }, [inExam, endsAt, offset, finish]);

  // ---- Actions ------------------------------------------------------------------------------
  async function allowMedia() {
    // Browsers hide the camera API entirely on plain-http pages (anything but localhost)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMedia("insecure");
      return;
    }
    setMedia("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      setMedia("ready");
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setMedia(
        name === "NotFoundError" || name === "OverconstrainedError"
          ? "nodevice"
          : name === "NotReadableError" || name === "AbortError"
            ? "busy"
            : "denied",
      );
    }
  }

  async function reenableMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      broadcasterRef.current?.restream();
    } catch {
      toast.error("Allow camera and microphone access in your browser to continue.");
    }
  }

  async function beginExam() {
    if (!accessToken || !test) return;
    const state = displayState();
    setDisplay(state);
    if (!state.supported || state.extended) return;

    setStarting(true);
    try {
      const attempt = await startScreeningTest(test.id, accessToken);
      finishedRef.current = false;
      setViolations(attempt.violation_count);
      setMaxViolations(attempt.max_violations);
      setEndsAt(new Date(attempt.ends_at).getTime());
      setOffset(new Date(attempt.server_time).getTime() - Date.now());
      setQuestions(attempt.questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start the exam.");
    } finally {
      setStarting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void finish();
  }

  // ---- Views --------------------------------------------------------------------------------
  if (loadError) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">{loadError}</p>;
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
      <Centered>
        <Icon tone={result.terminated ? "danger" : "primary"}>
          {result.terminated ? <ShieldAlert className="size-7" /> : <CheckCircle2 className="size-7" />}
        </Icon>
        <h1 className="text-xl font-semibold">{result.terminated ? "Exam ended" : "Test submitted"}</h1>
        {result.terminated ? (
          <p className="text-sm text-muted-foreground">
            Your exam was ended after repeated rule violations. Your answers so far were submitted.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          You scored <span className="font-semibold text-foreground">{result.score}</span> out of {result.total}.
        </p>
        <p className="text-xs text-muted-foreground">
          The recruiter will review results and may shortlist you from here.
        </p>
      </Centered>
    );
  }

  const startMs = new Date(test.start_time).getTime();
  const endMs = new Date(test.ends_at).getTime();

  if (!inExam && serverNow >= endMs) {
    return (
      <Centered>
        <Icon tone="danger">
          <TimerOff className="size-7" />
        </Icon>
        <h1 className="text-xl font-semibold">This exam has ended</h1>
        <p className="text-sm text-muted-foreground">
          {test.title} closed on {formatExamTime(test.ends_at)}. The exam link is no longer available.
        </p>
      </Centered>
    );
  }

  if (!inExam && serverNow < startMs) {
    return (
      <Centered>
        <Icon>
          <Clock className="size-7" />
        </Icon>
        <h1 className="text-xl font-semibold">{test.title}</h1>
        <p className="text-sm text-muted-foreground">
          Starts {formatExamTime(test.start_time)} · {test.duration_minutes} minutes
        </p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">Starts in</p>
        <p className="font-mono text-4xl font-semibold tabular-nums" data-testid="countdown">
          {clock(startMs - serverNow)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Keep this page open. The exam unlocks automatically when the clock reaches zero.
        </p>
      </Centered>
    );
  }

  if (!inExam) {
    const displayBad = display !== null && (!display.supported || display.extended);
    return (
      <div className="bg-secondary/40 px-4 py-10 md:py-14">
        <div className="mx-auto w-full max-w-xl">
          <Card className="animate-fade-up shadow-xl shadow-primary/5">
            <CardContent className="space-y-5">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
                {test.description ? <p className="mt-1 text-sm text-muted-foreground">{test.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{test.duration_minutes} minutes</Badge>
                  <Badge variant="secondary">Closes {formatExamTime(test.ends_at)}</Badge>
                  <Badge variant="outline" className="tabular-nums">
                    {clock(endMs - serverNow)} left
                  </Badge>
                </div>
              </div>

              <ul className="space-y-1.5 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                <li>The exam closes for everyone at the time above, even if you start late.</li>
                <li>Your camera and microphone must stay on for the whole exam.</li>
                <li>
                  Your camera and microphone are{" "}
                  <span className="font-semibold text-foreground">streamed live to the recruiter</span> while
                  you sit the exam. Nothing is recorded by UniHire.
                </li>
                <li>
                  Don&apos;t switch tabs or windows. Each switch is recorded and{" "}
                  <span className="font-semibold text-foreground">3 violations end your exam</span>.
                </li>
                <li>Only one monitor is allowed.</li>
                <li>Questions appear in a different order for each student.</li>
              </ul>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Camera className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">Camera and microphone</p>
                      <p className="text-xs text-muted-foreground">
                        {media === "ready"
                          ? "Both are on"
                          : media === "denied"
                            ? "Blocked. Allow access in your browser's address bar, then try again."
                            : media === "insecure"
                              ? "This page isn't served over HTTPS, so the browser won't offer your camera. Open the secure (https) link, or use localhost."
                              : media === "nodevice"
                                ? "No camera or microphone was found. Connect one and try again."
                                : media === "busy"
                                  ? "Your camera or microphone is in use by another app. Close it and try again."
                                  : "Your browser will ask for permission."}
                      </p>
                    </div>
                  </div>
                  {media === "ready" ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Button size="sm" onClick={allowMedia} disabled={media === "asking"} className="gap-2">
                      {media === "asking" ? <Spinner /> : null}
                      {media !== "idle" && media !== "asking" ? "Try again" : "Allow"}
                    </Button>
                  )}
                </div>

                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3",
                    displayBad && "border-destructive/50 bg-destructive/5",
                  )}
                >
                  <Monitor className={cn("size-5 shrink-0", displayBad ? "text-destructive" : "text-primary")} />
                  <div className="text-sm">
                    <p className="font-semibold">Single display</p>
                    <p className="text-xs text-muted-foreground">
                      {display === null
                        ? "Checked when you start."
                        : !display.supported
                          ? "This browser can't confirm your display setup. Use a recent Chrome or Edge."
                          : display.extended
                            ? "More than one monitor detected. Disconnect the others and try again."
                            : "One monitor detected"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full gap-2"
                disabled={media !== "ready" || starting}
                onClick={beginExam}
              >
                {starting ? <Spinner /> : null}
                Start exam
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Exam ---------------------------------------------------------------------------------
  const remaining = endsAt - serverNow;
  return (
    <div className="bg-secondary/40 px-4 py-6 md:py-10">
      {blocker || warning ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md text-center">
            <CardContent className="flex flex-col items-center gap-3">
              <Icon tone="danger">
                <ShieldAlert className="size-7" />
              </Icon>
              {blocker === "monitor" ? (
                <>
                  <h2 className="text-lg font-semibold">Multiple monitors detected</h2>
                  <p className="text-sm text-muted-foreground">
                    Disconnect the extra display to continue. The exam clock keeps running.
                  </p>
                </>
              ) : blocker === "camera" ? (
                <>
                  <h2 className="text-lg font-semibold">Camera or microphone is off</h2>
                  <p className="text-sm text-muted-foreground">
                    Turn them back on to continue. The exam clock keeps running.
                  </p>
                  <Button onClick={reenableMedia}>Turn camera and microphone on</Button>
                </>
              ) : warning ? (
                <>
                  <h2 className="text-lg font-semibold">
                    Warning {violations} of {maxViolations}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {VIOLATION_TEXT[warning]} This was recorded and the recruiter can see it. At{" "}
                    {maxViolations} violations your exam ends automatically.
                  </p>
                  <Button onClick={() => setWarning(null)}>Return to exam</Button>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{test.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={remaining < 5 * 60_000 ? "destructive" : "secondary"}
                className="gap-1 tabular-nums"
                data-testid="timer"
              >
                <Clock className="size-3" />
                {clock(remaining)}
              </Badge>
              <Badge variant={violations > 0 ? "destructive" : "outline"} data-testid="violations">
                Violations {violations}/{maxViolations}
              </Badge>
              {viewers > 0 ? (
                <Badge variant="outline" className="gap-1" data-testid="watching">
                  <span className="size-1.5 rounded-full bg-red-500" /> Recruiter is watching
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="relative shrink-0 overflow-hidden rounded-xl border bg-black">
            <video ref={attachVideo} autoPlay muted playsInline className="h-20 w-28 -scale-x-100 object-cover" />
            <span className="absolute top-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              <Video className="size-3 text-red-500" /> LIVE
            </span>
          </div>
        </div>

        <Card>
          <CardContent>
            <div ref={formHostRef}>
              <Questionnaire shortcuts="letters" onSubmit={handleSubmit}>
                <QuestionnaireProgress />
                {questions.map((question, qIndex) => (
                  <QuestionnaireItem key={question.id} name={`q-${question.id}`}>
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
            </div>
          </CardContent>
        </Card>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CircleAlert className="size-3.5" /> Unanswered questions are scored as wrong. Closing this page
          doesn&apos;t stop the clock.
        </p>
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
