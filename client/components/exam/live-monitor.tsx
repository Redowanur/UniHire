"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, ShieldAlert, Volume2, VolumeX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveViewer, type LiveStudent } from "@/lib/live";
import { cn } from "cn";

function Tile({ student }: { student: LiveStudent }) {
  // Browsers only autoplay muted video, so audio is opt-in per student
  const [muted, setMuted] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border bg-card" data-testid="live-tile">
      <div className="relative aspect-video bg-black">
        {student.stream ? (
          <video
            autoPlay
            playsInline
            muted={muted}
            className="size-full -scale-x-100 object-cover"
            ref={(el) => {
              if (el && el.srcObject !== student.stream) el.srcObject = student.stream;
            }}
          />
        ) : (
          <div className="grid size-full place-items-center text-xs text-white/70">Connecting…</div>
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <span className="size-1.5 rounded-full bg-red-500" /> LIVE
        </span>
        <Button
          size="icon-sm"
          variant="secondary"
          className="absolute right-2 bottom-2"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? `Listen to ${student.name}` : `Mute ${student.name}`}
          disabled={!student.stream}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="truncate text-sm font-medium">{student.name}</p>
        <Badge
          variant={student.violations > 0 ? "destructive" : "outline"}
          className={cn("shrink-0 gap-1 tabular-nums")}
        >
          {student.violations > 0 ? <ShieldAlert className="size-3" /> : null}
          {student.violations} violation{student.violations === 1 ? "" : "s"}
        </Badge>
      </div>
    </div>
  );
}

/** Live camera + microphone of every student currently sitting the exam. */
export function LiveMonitor({
  testId,
  accessToken,
  onSubmitted,
}: {
  testId: string;
  accessToken: string;
  /** Called when a student hands in their exam, so the results table can refresh. */
  onSubmitted?: () => void;
}) {
  const submittedRef = useRef(onSubmitted);
  useEffect(() => {
    submittedRef.current = onSubmitted;
  }, [onSubmitted]);

  const [students, setStudents] = useState<LiveStudent[]>([]);

  useEffect(() => {
    const viewer = new LiveViewer(testId, accessToken, setStudents, (event) => {
      if (event.type === "submitted") submittedRef.current?.();
    });
    viewer.start();
    return () => viewer.stop();
  }, [testId, accessToken]);

  return (
    <Card className="animate-fade-up mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="size-4 text-red-500" /> Live monitoring
        </CardTitle>
        <CardDescription>
          Students appear here while they sit the exam. Video is peer-to-peer and isn&apos;t recorded.
          Tap the speaker on a tile to listen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No student is taking the exam right now.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Tile key={student.peerId} student={student} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
