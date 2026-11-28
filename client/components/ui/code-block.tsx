import { highlightCode } from "@/lib/highlight";
import { cn } from "@/lib/utils";

/** Read-only, syntax-highlighted code (used for questions like "what does this print?"). */
export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language?: string | null;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-xl border bg-muted/60 px-4 py-3 font-mono text-[0.8125rem] leading-6 text-foreground",
        className,
      )}
    >
      <code
        data-language={language ?? "plaintext"}
        dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
      />
    </pre>
  );
}
