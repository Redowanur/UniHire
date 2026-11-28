"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { PasswordInput } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { generateQuestions, type AiProvider, type QuestionDraft } from "@/lib/api";

const STORAGE_KEY = "unihire.ai-settings";

const PROVIDERS: { value: AiProvider; label: string; modelHint: string }[] = [
  { value: "openai", label: "OpenAI (ChatGPT)", modelHint: "gpt-4o-mini" },
  { value: "gemini", label: "Google Gemini", modelHint: "gemini-3.8-flash" },
];

type Saved = { provider: AiProvider; apiKey: string; model: string };

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (parsed && (parsed.provider === "openai" || parsed.provider === "gemini") && typeof parsed.apiKey === "string") {
      return { provider: parsed.provider, apiKey: parsed.apiKey, model: parsed.model ?? "" };
    }
  } catch {
    // ignore a corrupt entry
  }
  return null;
}

/**
 * Drafts questions with the recruiter's own OpenAI or Gemini key and hands them to the form.
 * The key goes to our API for one request and is never stored there; it stays in this browser
 * only if "Remember" is ticked.
 */
export function AiQuestionGenerator({
  accessToken,
  onGenerated,
}: {
  accessToken: string;
  onGenerated: (questions: QuestionDraft[]) => void;
}) {
  const [open, setOpen] = useState(false);
  // Read once on first render; the dialog only mounts on the client
  const [saved] = useState<Saved | null>(() => (typeof window === "undefined" ? null : loadSaved()));
  const [provider, setProvider] = useState<AiProvider>(saved?.provider ?? "openai");
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? "");
  const [model, setModel] = useState(saved?.model ?? "");
  const [remember, setRemember] = useState(saved !== null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("5");
  const [busy, setBusy] = useState(false);

  const providerInfo = PROVIDERS.find((p) => p.value === provider)!;

  async function handleGenerate() {
    if (busy) return;
    if (apiKey.trim().length < 8) return toast.error("Paste your API key first.");
    if (prompt.trim().length < 5) return toast.error("Describe the questions you want.");

    setBusy(true);
    try {
      const result = await generateQuestions(
        {
          provider,
          api_key: apiKey.trim(),
          model: model.trim() || undefined,
          prompt: prompt.trim(),
          count: Math.min(20, Math.max(1, Number(count) || 5)),
        },
        accessToken,
      );
      if (remember) localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, apiKey: apiKey.trim(), model: model.trim() }));
      else localStorage.removeItem(STORAGE_KEY);

      onGenerated(result.questions);
      toast.success(
        `Added ${result.questions.length} question${result.questions.length === 1 ? "" : "s"} from ${result.model}.` +
          (result.skipped ? ` ${result.skipped} unusable one${result.skipped === 1 ? " was" : "s were"} dropped.` : "") +
          " Check each marked answer.",
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate questions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> Generate questions with AI
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="space-y-4 border-t p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider((v as AiProvider) ?? "openai")}
                items={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-model">Model (optional)</Label>
              <Input
                id="ai-model"
                placeholder={providerInfo.modelHint}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key">Your {providerInfo.label} API key</Label>
            <PasswordInput
              id="ai-key"
              placeholder={provider === "openai" ? "sk-..." : "AIza..."}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
            />
            <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} className="mt-0.5" />
              <span>
                Remember it in this browser. It is stored unencrypted on this device, so leave this off on a
                shared computer. We never store it on our servers.
              </span>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-prompt">What should the questions cover?</Label>
              <Textarea
                id="ai-prompt"
                rows={3}
                maxLength={2000}
                placeholder='e.g. "Python list and dictionary basics for juniors, half of them "what is the output of this code?"'
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-count">How many</Label>
              <Input
                id="ai-count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <p>
              AI can get answers wrong, especially for &ldquo;what is the output&rdquo; questions. The correct
              option is pre-marked; read every question and run the code yourself before publishing. Generating
              uses your own provider quota.
            </p>
          </div>

          <Button type="button" onClick={handleGenerate} disabled={busy} className="gap-2">
            {busy ? <Spinner /> : <Sparkles />}
            {busy ? "Generating..." : "Generate"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
