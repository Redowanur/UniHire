"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Link2, PlusCircle, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  createCohort,
  fetchSuggestedCohorts,
  joinCohort,
  searchCohorts,
  type CohortSummary,
} from "@/lib/api";

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
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{cohort.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {cohort.university_name} · {cohort.dept_name} · Batch {cohort.batch_year}
        </p>
        <Badge variant="secondary" className="mt-2">
          {cohort.member_count} member{cohort.member_count === 1 ? "" : "s"}
        </Badge>
      </div>
      <Button disabled={joining} onClick={() => onJoin(cohort.id)} className="shrink-0 gap-2">
        {joining ? <Spinner /> : null}
        Join
      </Button>
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
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-16">
        <Skeleton className="mx-auto size-14 rounded-full" />
        <Skeleton className="mx-auto h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user.is_verified) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Verify your email first</h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
    <div className="bg-secondary/40 py-10 md:py-16">
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="animate-fade-up text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Users className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Join or start your cohort
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your cohort is how your department reaches recruiters together.
          </p>
        </div>

        <Card className="animate-fade-up mt-8" style={{ animationDelay: "100ms" }}>
          <CardContent>
            <Tabs defaultValue="find">
              <TabsList className="grid w-full grid-cols-3 group-data-horizontal/tabs:h-11">
                <TabsTrigger value="find">
                  <Search /> <span className="hidden sm:inline">Find</span> cohort
                </TabsTrigger>
                <TabsTrigger value="link">
                  <Link2 /> Invite link
                </TabsTrigger>
                <TabsTrigger value="create">
                  <PlusCircle /> Create
                </TabsTrigger>
              </TabsList>

              <TabsContent value="find" className="mt-4 space-y-6">
                {suggested === null ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : suggested.length > 0 ? (
                  <section>
                    <h2 className="text-base font-semibold">Suggested for you</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">Cohorts in your department.</p>
                    <ul className="mt-3 space-y-3">
                      {suggested.map((cohort) => (
                        <CohortCard
                          key={cohort.id}
                          cohort={cohort}
                          onJoin={handleJoin}
                          joining={joiningId === cohort.id}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <h2 className="text-base font-semibold">Search for a cohort</h2>
                  <form onSubmit={handleSearch} className="mt-3 flex gap-2">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cohort name"
                    />
                    <Button type="submit" className="shrink-0 gap-2">
                      <Search /> Search
                    </Button>
                  </form>
                  {results ? (
                    results.length === 0 ? (
                      <p className="mt-4 text-sm text-muted-foreground">No cohorts matched that search.</p>
                    ) : (
                      <ul className="mt-4 space-y-3">
                        {results.map((cohort) => (
                          <CohortCard
                            key={cohort.id}
                            cohort={cohort}
                            onJoin={handleJoin}
                            joining={joiningId === cohort.id}
                          />
                        ))}
                      </ul>
                    )
                  ) : null}
                </section>
              </TabsContent>

              <TabsContent value="link" className="mt-4">
                <CardHeader className="px-0">
                  <CardTitle className="text-base">Have an invite link?</CardTitle>
                  <CardDescription>Paste a link a classmate sent you to join their cohort.</CardDescription>
                </CardHeader>
                <form onSubmit={handleOpenLink} className="mt-2 flex gap-2">
                  <Input
                    value={linkInput}
                    onChange={(event) => setLinkInput(event.target.value)}
                    placeholder="Paste the invite link or code"
                  />
                  <Button type="submit" variant="outline" className="shrink-0">
                    Go
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="create" className="mt-4">
                <CardHeader className="px-0">
                  <CardTitle className="text-base">Create a new cohort</CardTitle>
                  <CardDescription>Start one for your department and invite classmates.</CardDescription>
                </CardHeader>
                <form onSubmit={handleCreate} className="mt-2 flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Cohort name (e.g. CSE Batch 2026)"
                      value={form.name}
                      onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
                    />
                    <Input
                      required
                      type="number"
                      min={2001}
                      max={2099}
                      placeholder="Graduation year"
                      value={form.batch_year}
                      onChange={(event) => setForm((f) => ({ ...f, batch_year: event.target.value }))}
                    />
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
                  />
                  <Button type="submit" size="lg" disabled={creating} className="gap-2">
                    {creating ? <Spinner /> : null}
                    Create cohort
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
