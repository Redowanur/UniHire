"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, MapPin, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { JOB_CATEGORIES } from "@/lib/api";

export const SALARY_MIN = 0;
export const SALARY_MAX = 250_000;
const SALARY_STEP = 5_000;

const ANY = "any";

const categoryItems = [
  { value: ANY, label: "All categories" },
  ...JOB_CATEGORIES.map((c) => ({ value: c.value as string, label: c.label })),
];
const jobTypeItems = [
  { value: ANY, label: "Any job type" },
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];
const workPlaceItems = [
  { value: ANY, label: "Any workplace" },
  { value: "onsite", label: "Onsite" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];
const postedItems = [
  { value: ANY, label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

function formatMoney(value: number) {
  return value >= 1000 ? `৳${Math.round(value / 1000)}k` : `৳${value}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-semibold">{title}</Label>
      {children}
    </div>
  );
}

function FilterForm({ onApplied }: { onApplied?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [location, setLocation] = useState(params.get("location") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? ANY);
  const [jobType, setJobType] = useState(params.get("job_type") ?? ANY);
  const [workPlace, setWorkPlace] = useState(params.get("work_place") ?? ANY);
  const [posted, setPosted] = useState(params.get("posted_within") ?? ANY);
  const [salary, setSalary] = useState<number[]>([
    Number(params.get("salary_min") ?? SALARY_MIN),
    Number(params.get("salary_max") ?? SALARY_MAX),
  ]);

  function apply() {
    const next = new URLSearchParams();
    const search = params.get("search");
    if (search) next.set("search", search);
    if (location.trim()) next.set("location", location.trim());
    if (category !== ANY) next.set("category", category);
    if (jobType !== ANY) next.set("job_type", jobType);
    if (workPlace !== ANY) next.set("work_place", workPlace);
    if (posted !== ANY) next.set("posted_within", posted);
    if (salary[0] > SALARY_MIN) next.set("salary_min", String(salary[0]));
    if (salary[1] < SALARY_MAX) next.set("salary_max", String(salary[1]));
    startTransition(() => {
      router.push(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
      onApplied?.();
    });
  }

  function reset() {
    setLocation("");
    setCategory(ANY);
    setJobType(ANY);
    setWorkPlace(ANY);
    setPosted(ANY);
    setSalary([SALARY_MIN, SALARY_MAX]);
    const search = params.get("search");
    startTransition(() => {
      router.push(search ? `${pathname}?search=${encodeURIComponent(search)}` : pathname, {
        scroll: false,
      });
      onApplied?.();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-1 pb-2">
        <Section title="Location">
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City or country"
              className="pl-9"
            />
          </div>
        </Section>

        <Section title="Category">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v ?? ANY)}
            items={categoryItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        <Section title="Job type">
          <Select
            value={jobType}
            onValueChange={(v) => setJobType(v ?? ANY)}
            items={jobTypeItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobTypeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        <Section title="Workplace">
          <Select
            value={workPlace}
            onValueChange={(v) => setWorkPlace(v ?? ANY)}
            items={workPlaceItems}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workPlaceItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        <Section title="Date posted">
          <RadioGroup value={posted} onValueChange={(v) => setPosted(String(v))} className="gap-1">
            {postedItems.map((item) => (
              <Label
                key={item.value}
                htmlFor={`posted-${item.value}`}
                className="cursor-pointer gap-3 rounded-lg px-2 py-2 font-normal transition-colors hover:bg-muted"
              >
                <RadioGroupItem id={`posted-${item.value}`} value={item.value} />
                {item.label}
              </Label>
            ))}
          </RadioGroup>
        </Section>

        <Section title="Salary (per month)">
          <div className="px-1.5 pt-2">
            <Slider
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={SALARY_STEP}
              value={salary}
              onValueChange={(v) => setSalary(Array.isArray(v) ? [...v] : [v, v])}
              aria-label="Salary range"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <Badge variant="secondary">{formatMoney(salary[0])}</Badge>
            <span>to</span>
            <Badge variant="secondary">
              {formatMoney(salary[1])}
              {salary[1] >= SALARY_MAX ? "+" : ""}
            </Badge>
          </div>
        </Section>
      </div>

      <div className="mt-4 flex gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={reset} disabled={pending} className="gap-1.5">
          <RotateCcw className="size-4" />
          Reset
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? <Spinner /> : null}
          Apply filters
        </Button>
      </div>
    </form>
  );
}

/** Filter box shown beside the results on desktop. */
export function FilterSidebar() {
  return (
    <Card className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] lg:flex">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex items-center gap-2 text-base font-semibold">
          <ListFilter className="size-4.5 text-primary" />
          Filters
        </div>
        <FilterForm />
      </CardContent>
    </Card>
  );
}

/** Button + side drawer for the same filters on small screens. */
export function FilterDrawer({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="gap-2 lg:hidden" />}>
        <ListFilter className="size-4.5" />
        Filters
        {activeCount > 0 ? <Badge className="ml-0.5 h-5 min-w-5 px-1.5">{activeCount}</Badge> : null}
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Filter jobs</SheetTitle>
          <SheetDescription>Narrow down roles, then apply.</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-5">
          <FilterForm onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
