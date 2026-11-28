"use client";

import { Code2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/ui/code-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuestionDraft } from "@/lib/api";
import { CODE_LANGUAGES } from "@/lib/highlight";

/** One question in the test form: text, an optional highlighted code snippet, options and the correct one. */
export function QuestionEditor({
  index,
  question,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  question: QuestionDraft;
  canRemove: boolean;
  onChange: (patch: Partial<QuestionDraft>) => void;
  onRemove: () => void;
}) {
  const hasCode = question.code != null;

  function setOption(oIndex: number, value: string) {
    onChange({ options: question.options.map((o, j) => (j === oIndex ? value : o)) });
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Question {index + 1}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={hasCode ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5"
            aria-pressed={hasCode}
            onClick={() =>
              onChange(hasCode ? { code: null, language: null } : { code: "", language: "python" })
            }
          >
            <Code2 /> {hasCode ? "Remove code" : "Add code"}
          </Button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              onClick={onRemove}
              aria-label="Remove question"
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>

      <Input
        required
        placeholder="Question text (e.g. What is the output of this code?)"
        value={question.text}
        maxLength={500}
        onChange={(event) => onChange({ text: event.target.value })}
        className="mt-2"
      />

      {hasCode ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`q${index}-code`} className="text-xs text-muted-foreground">
              Code shown to students
            </Label>
            <Select
              value={question.language ?? "plaintext"}
              onValueChange={(v) => onChange({ language: v ?? "plaintext" })}
              items={CODE_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
            >
              <SelectTrigger size="sm" className="w-40" aria-label="Code language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODE_LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CodeEditor
            id={`q${index}-code`}
            value={question.code ?? ""}
            language={question.language}
            onChange={(code) => onChange({ code })}
            placeholder="Paste or type the code. Tab indents."
          />
          {(question.code ?? "").length > 3500 ? (
            <p className="text-xs text-muted-foreground">{(question.code ?? "").length} / 4000 characters</p>
          ) : null}
        </div>
      ) : null}

      <RadioGroup
        value={String(question.correct_index)}
        onValueChange={(v) => onChange({ correct_index: Number(v) })}
        className="mt-3 gap-2"
      >
        {question.options.map((option, oIndex) => (
          <div key={oIndex} className="flex items-center gap-3">
            <RadioGroupItem
              value={String(oIndex)}
              id={`q${index}-o${oIndex}`}
              aria-label={`Mark option ${oIndex + 1} as correct`}
            />
            <Label htmlFor={`q${index}-o${oIndex}`} className="sr-only">
              Option {oIndex + 1}
            </Label>
            <Input
              required
              placeholder={`Option ${oIndex + 1}`}
              value={option}
              onChange={(event) => setOption(oIndex, event.target.value)}
            />
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
