import { Suspense } from "react";
import Image from "next/image";
import { Icon } from "@/components/icon";
import { Container } from "@/components/ui/container";
import { SearchBar } from "@/components/home/search-bar";
import { fetchStats } from "@/lib/api";
import { heroImage } from "@/lib/data";

async function HeroStats() {
  const stats = await fetchStats().catch(() => ({ universities: 0, cohorts: 0, recruiters: 0 }));

  const items = [
    { icon: "building" as const, value: stats.universities, label: "Universities" },
    { icon: "users" as const, value: stats.cohorts, label: "Cohorts" },
    { icon: "briefcase" as const, value: stats.recruiters, label: "Verified recruiters" },
  ];

  return (
    <>
      {items.map((stat) => (
        <li key={stat.label} className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-xl bg-primary-500 text-white">
            <Icon name={stat.icon} className="size-5" />
          </span>
          <span className="text-left">
            <span className="block font-display text-xl font-bold leading-6 md:text-2xl">
              {stat.value.toLocaleString()}
            </span>
            <span className="block text-sm text-white/65">{stat.label}</span>
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
        <li key={i} className="flex items-center gap-3.5">
          <span className="size-12 animate-pulse rounded-xl bg-white/10" />
          <span className="text-left">
            <span className="block h-6 w-12 animate-pulse rounded bg-white/10" />
            <span className="mt-1.5 block h-4 w-24 animate-pulse rounded bg-white/10" />
          </span>
        </li>
      ))}
    </>
  );
}

export function Hero() {
  return (
    <section className="relative bg-night-950 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={heroImage.src}
          alt={heroImage.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-night-950/75 via-night-950/55 to-night-950"
          aria-hidden="true"
        />
        <div
          className="absolute -left-24 top-0 size-96 rounded-full bg-primary-500/20 blur-3xl"
          aria-hidden="true"
        />
      </div>

      <Container className="relative flex flex-col items-center pb-14 pt-16 text-center md:pb-20 md:pt-20 lg:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-accent-300 ring-1 ring-white/15">
          Built for graduating cohorts
        </span>

        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl lg:text-[56px] lg:leading-[1.1]">
          Bring recruiters to your campus.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 md:text-base md:leading-7">
          Join your graduating cohort, discover who&apos;s hiring, and invite recruiters
          straight to your university — then shortlist the best fits with a screening test.
        </p>

        <SearchBar className="mt-10" />

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
          <Suspense fallback={<HeroStatsSkeleton />}>
            <HeroStats />
          </Suspense>
        </ul>
      </Container>
    </section>
  );
}
