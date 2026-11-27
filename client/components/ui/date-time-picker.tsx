"use client";

import { CalendarIcon, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Date (calendar popover) + time (HH:mm) picker built from shadcn's Calendar and Input.
 * `value` is a local "YYYY-MM-DDTHH:mm" string, or "" when nothing is picked yet.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  minDate,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Earliest selectable day (the time is not restricted here). */
  minDate?: Date;
  className?: string;
}) {
  const [datePart = "", timePart = ""] = value.split("T");
  const selected = datePart ? new Date(`${datePart}T00:00`) : undefined;

  function pickDate(day: Date | undefined) {
    if (!day) return;
    const next = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    onChange(`${next}T${timePart || "09:00"}`);
  }

  function pickTime(time: string) {
    if (!time) return;
    // Picking a time before a date defaults to today
    const day = datePart || (() => {
      const now = new Date();
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    })();
    onChange(`${day}T${time}`);
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn("min-w-0 flex-1 justify-start gap-2 font-normal", !selected && "text-muted-foreground")}
            />
          }
        >
          <CalendarIcon />
          <span className="truncate">
            {selected
              ? selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
              : "Pick a date"}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={pickDate}
            defaultMonth={selected}
            disabled={minDate ? { before: minDate } : undefined}
          />
        </PopoverContent>
      </Popover>
      <div className="relative w-32 shrink-0">
        <Clock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="time"
          step={60}
          required
          aria-label="Time"
          disabled={disabled}
          value={timePart}
          onChange={(event) => pickTime(event.target.value)}
          className="appearance-none pl-9 [&::-webkit-calendar-picker-indicator]:hidden"
        />
      </div>
    </div>
  );
}
