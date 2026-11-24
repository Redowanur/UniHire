import { Suspense } from "react";
import { Briefcase, Building2, Users } from "lucide-react";

import { HeroPattern } from "@/components/home/hero-pattern";
import { SearchBar } from "@/components/home/search-bar";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStats } from "@/lib/api";

async function HeroStats() {
  const stats = await fetchStats().catch(() => ({ universities: 0, cohorts: 0, recruiters: 0 }));

  const items = [
    { icon: Building2, value: stats.universities, label: "Universities" },
    { icon: Users, value: stats.cohorts, label: "Cohorts" },
    { icon: Briefcase, value: stats.recruiters, label: "Verified recruiters" },
  ];

  return (
    <>
      {items.map((stat) => (
        <li key={stat.label} className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-night-foreground ring-1 ring-white/15 backdrop-blur">
            <stat.icon className="size-5" />
          </span>
          <span className="text-left">
            <span className="block text-xl font-semibold leading-6 md:text-2xl">
              {stat.value.toLocaleString()}
            </span>
            <span className="block text-sm text-night-foreground/65">{stat.label}</span>
          </span>
        </li>
      ))}
    </>
  );
}

function HeroStatsSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl bg-white/10" />
          <span className="space-y-1.5">
            <Skeleton className="block h-5 w-12 bg-white/10" />
            <Skeleton className="block h-4 w-24 bg-white/10" />
          </span>
        </li>
      ))}
    </>
  );
}

export function Hero() {
  return (
    <section className="relative z-10 bg-night text-night-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.42_0.2_285),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.38_0.16_320),transparent_55%)]" />
        <HeroPattern className="absolute inset-0 text-white opacity-[0.09] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_95%)]" />
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-warm/15 blur-3xl" />
      </div>

      <Container className="relative flex flex-col items-center pt-14 pb-14 text-center sm:pt-20 md:pb-20 lg:pt-24">
        <Badge className="animate-fade-up h-7 gap-2 bg-white/10 px-3.5 text-xs text-warm ring-1 ring-white/15">
          Built for graduating cohorts
        </Badge>

        <h1
          className="animate-fade-up mt-5 max-w-3xl text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          Bring recruiters to your campus.
        </h1>
        <p
          className="animate-fade-up mt-5 max-w-xl text-sm leading-6 text-night-foreground/70 md:text-base md:leading-7"
          style={{ animationDelay: "160ms" }}
        >
          Join your graduating cohort, discover who&apos;s hiring, and invite recruiters straight to
          your university — then shortlist the best fits with a screening test.
        </p>

        <div className="animate-fade-up mt-9 w-full" style={{ animationDelay: "240ms" }}>
          <SearchBar />
        </div>

        <ul
          className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14"
          style={{ animationDelay: "320ms" }}
        >
          <Suspense fallback={<HeroStatsSkeleton />}>
            <HeroStats />
          </Suspense>
        </ul>
      </Container>
    </section>
  );
}
