"use client";

import type { KeyboardEvent } from "react";

import { highlightCode } from "@/lib/highlight";
import { cn } from "@/lib/utils";

const TEXT = "px-4 py-3 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap break-words";

/**
 * A textarea that highlights as you type: a transparent textarea sits on top of a highlighted
 * copy of the same text. Both use the same font, padding and wrapping so they line up.
 */
export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string | null;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Tab indents instead of leaving the field (Escape then Tab still moves focus on)
    if (event.key !== "Tab" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(`${value.slice(0, start)}    ${value.slice(end)}`);
    requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
  }

  return (
    <div
      className={cn(
        "relative grid min-h-24 overflow-hidden rounded-xl border bg-muted/60 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        className,
      )}
    >
      <pre aria-hidden className={cn(TEXT, "pointer-events-none col-start-1 row-start-1 m-0 min-w-0")}>
        {/* The trailing newline keeps a final empty line the same height in both layers */}
        <code dangerouslySetInnerHTML={{ __html: `${highlightCode(value, language)}\n` }} />
      </pre>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={1}
        className={cn(
          TEXT,
          "col-start-1 row-start-1 m-0 min-w-0 resize-none overflow-hidden border-0 bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-foreground",
        )}
      />
    </div>
  );
}
