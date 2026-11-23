"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  createCohort,
  fetchSuggestedCohorts,
  joinCohort,
  searchCohorts,
  type CohortSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-heading outline-none transition-all duration-200 placeholder:font-normal placeholder:text-muted hover:border-muted focus:border-primary-400 focus:shadow-[0_0_0_3px_rgb(109_83_236_/_0.14)]";

function CohortCard({
  cohort,
  onJoin,
  joining,
}: {
  cohort: CohortSummary;
  onJoin: (id: string) => void;
  joining: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4">
      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold text-heading">{cohort.name}</p>
        <p className="mt-0.5 truncate text-sm text-body">
          {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year}
        </p>
        <p className="mt-1 text-xs text-muted">
          {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
        </p>
      </div>
      <button
        type="button"
        disabled={joining}
        onClick={() => onJoin(cohort.id)}
        className="shrink-0 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
      >
        Join
      </button>
    </li>
  );
}

export default function CohortOnboardingPage() {
  const router = useRouter();
  const { user, status, accessToken, refreshUser } = useAuth();

  const [suggested, setSuggested] = useState<CohortSummary[] | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<CohortSummary[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", batch_year: "", description: "" });
  const [creating, setCreating] = useState(false);

  const [linkInput, setLinkInput] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!accessToken || !user || user.cohort_id) return;
    fetchSuggestedCohorts(accessToken)
      .then(setSuggested)
      .catch(() => setSuggested([]));
  }, [accessToken, user]);

  async function handleJoin(cohortId: string) {
    if (!accessToken) return;
    setJoiningId(cohortId);
    try {
      await joinCohort(cohortId, accessToken);
      await refreshUser();
      router.push("/cohort");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join that cohort.");
      setJoiningId(null);
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setResults(await searchCohorts(search).catch(() => []));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setCreating(true);
    try {
      await createCohort(
        {
          name: form.name.trim(),
          batch_year: Number(form.batch_year),
          description: form.description.trim() || undefined,
        },
        accessToken,
      );
      await refreshUser();
      router.push("/cohort");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create that cohort.");
      setCreating(false);
    }
  }

  function handleOpenLink(event: FormEvent) {
    event.preventDefault();
    const token = linkInput.trim().split("/").filter(Boolean).pop();
    if (token) router.push(`/join/${token}`);
  }

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user.is_verified) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-heading">Verify your email first</h1>
        <p className="mt-2 text-sm text-body">
          Check your inbox for the verification link before joining or creating a cohort.
        </p>
      </div>
    );
  }

  if (user.cohort_id) {
    router.replace("/cohort");
    return null;
  }

  return (
    <div className="bg-surface/60 py-12 md:py-16">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="text-center">
          <span className="grid size-14 mx-auto place-items-center rounded-full bg-primary-50 text-primary-500">
            <Users className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-heading md:text-3xl">
            Join or start your cohort
          </h1>
          <p className="mt-2 text-sm text-body">
            Your cohort is how your department reaches recruiters together.
          </p>
        </div>

        {suggested && suggested.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-heading">Suggested for you</h2>
            <p className="mt-1 text-sm text-body">Cohorts in your department.</p>
            <ul className="mt-4 space-y-3">
              {suggested.map((cohort) => (
                <CohortCard key={cohort.id} cohort={cohort} onJoin={handleJoin} joining={joiningId === cohort.id} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-heading">Search for a cohort</h2>
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cohort name"
              className={inputClass}
            />
            <button
              type="submit"
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-night-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-night-800"
            >
              <Search className="size-4" />
              Search
            </button>
          </form>

          {results ? (
            results.length === 0 ? (
              <p className="mt-4 text-sm text-body">No cohorts matched that search.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {results.map((cohort) => (
                  <CohortCard key={cohort.id} cohort={cohort} onJoin={handleJoin} joining={joiningId === cohort.id} />
                ))}
              </ul>
            )
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-heading">Have an invite link?</h2>
          <form onSubmit={handleOpenLink} className="mt-4 flex gap-2">
            <input
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              placeholder="Paste the invite link or code"
              className={inputClass}
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-xl border border-line px-5 text-sm font-semibold text-heading transition-colors hover:border-primary-400 hover:text-primary-600"
            >
              Go
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-heading">Or create a new cohort</h2>
          <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                minLength={2}
                maxLength={100}
                placeholder="Cohort name (e.g. CSE Batch 2026)"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                className={cn(inputClass, "sm:col-span-1")}
              />
              <input
                required
                type="number"
                min={2001}
                max={2099}
                placeholder="Graduation year"
                value={form.batch_year}
                onChange={(event) => setForm((f) => ({ ...f, batch_year: event.target.value }))}
                className={inputClass}
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
              className="w-full resize-none rounded-xl border border-line bg-white p-3 text-sm text-heading outline-none placeholder:text-muted focus:border-primary-400"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Create cohort
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
