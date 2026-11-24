"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Building2, Clock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { fetchJobSuggestions, type JobSuggestion } from "@/lib/api";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const open = focused && trimmed !== "";

  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchJobSuggestions(trimmed, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setSuggestions(data);
          setError(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  return (
    <div ref={wrapRef} className={cn("relative mx-auto w-full max-w-2xl text-left", className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFocused(false);
          router.push(trimmed ? `/hiring?search=${encodeURIComponent(trimmed)}` : "/hiring");
        }}
        className="flex flex-col gap-2 rounded-2xl bg-card p-2 text-card-foreground shadow-2xl shadow-black/30 sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <label htmlFor="hero-job-title" className="sr-only">
            Job title or company
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="hero-job-title"
            name="search"
            type="text"
            placeholder="Role or company you want on campus"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (!value.trim()) {
                setSuggestions([]);
                setError(false);
                setLoading(false);
              } else {
                setLoading(true);
              }
            }}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              if (!wrapRef.current?.contains(event.relatedTarget as Node)) setFocused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setFocused(false);
            }}
            className="h-12 rounded-xl border-0 bg-transparent pr-10 pl-11 text-[15px] shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          {loading && trimmed ? (
            <Spinner className="absolute top-1/2 right-3.5 -translate-y-1/2 text-primary" />
          ) : null}
        </div>
        <Button type="submit" size="lg" className="h-12 w-full gap-2 px-7 sm:w-auto">
          <Search className="size-4.5" />
          Search
        </Button>
      </form>

      {open ? (
        <div
          id="hero-job-suggestions"
          className="animate-overlay-in absolute top-[calc(100%+10px)] right-0 left-0 z-30 origin-top overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl shadow-black/20"
        >
          {loading && suggestions.length === 0 ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              Couldn&apos;t load suggestions. Please try again.
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No open roles found.</p>
          ) : (
            <ScrollArea className="max-h-[min(20rem,50vh)]">
              <ul className="max-h-[min(20rem,50vh)]">
                {suggestions.map((job, index) => (
                  <li key={job.id}>
                    <Link
                      href={`/hiring/${job.id}`}
                      className="animate-item-in group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                        <BriefcaseBusiness className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{job.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="size-3.5 shrink-0" />
                          <span className="truncate">{job.company_name}</span>
                        </span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground sm:flex">
                        <Clock className="size-3.5" />
                        {job.posted}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}

          <Link
            href={`/hiring?search=${encodeURIComponent(trimmed)}`}
            className="group flex items-center justify-center gap-1.5 border-t py-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
          >
            See all results
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
