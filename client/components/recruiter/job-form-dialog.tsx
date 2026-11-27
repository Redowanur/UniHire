"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  createJob,
  JOB_CATEGORIES,
  updateJob,
  type JobCreatePayload,
  type JobDetail,
  type JobListing,
} from "@/lib/api";

const jobTypeItems = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];
const workPlaceItems = [
  { value: "onsite", label: "Onsite" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];
const categoryItems = JOB_CATEGORIES.map((c) => ({ value: c.value as string, label: c.label }));

type JobForm = {
  title: string;
  job_type: JobListing["job_type"];
  category: string;
  experience: string;
  salary: string;
  office_hours: string;
  work_place: JobListing["work_place"];
  vacancy: string;
  location: string;
  description: string;
  responsibilities: string;
  requirements: string;
  skills: string;
  benefits: string;
};

const emptyForm: JobForm = {
  title: "",
  job_type: "full_time",
  category: "engineering",
  experience: "",
  salary: "",
  office_hours: "",
  work_place: "onsite",
  vacancy: "1",
  location: "",
  description: "",
  responsibilities: "",
  requirements: "",
  skills: "",
  benefits: "",
};

function formFromJob(job: JobDetail): JobForm {
  return {
    title: job.title,
    job_type: job.job_type,
    category: job.category ?? "other",
    experience: job.experience,
    salary: job.salary,
    office_hours: job.office_hours,
    work_place: job.work_place,
    vacancy: String(job.vacancy),
    location: job.location,
    description: job.description,
    responsibilities: job.responsibilities.join(", "),
    requirements: job.requirements.join(", "),
    skills: job.skills.join(", "),
    benefits: job.benefits.join(", "),
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function PickField({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(v) => onChange(v ?? value)} items={items}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Create a job post (job = null) or edit an existing one. Mount it with a `key` that changes per
 * target so the form starts from the right values.
 */
function JobFormBody({
  job,
  accessToken,
  onClose,
  onSaved,
}: {
  job: JobDetail | null;
  accessToken: string;
  onClose: () => void;
  onSaved: (jobId: string, payload: JobCreatePayload) => void;
}) {
  const [form, setForm] = useState<JobForm>(job ? formFromJob(job) : emptyForm);
  const [saving, setSaving] = useState(false);
  const editing = job !== null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: JobCreatePayload = {
      title: form.title.trim(),
      job_type: form.job_type,
      experience: form.experience.trim(),
      salary: form.salary.trim(),
      office_hours: form.office_hours.trim(),
      work_place: form.work_place,
      vacancy: Number(form.vacancy),
      location: form.location.trim(),
      category: form.category,
      description: form.description.trim(),
      responsibilities: splitList(form.responsibilities),
      requirements: splitList(form.requirements),
      skills: splitList(form.skills),
      benefits: splitList(form.benefits),
    };
    setSaving(true);
    try {
      if (job) {
        await updateJob(job.id, payload, accessToken);
        toast.success("Job post updated");
        onSaved(job.id, payload);
      } else {
        const { job_id } = await createJob(payload, accessToken);
        toast.success("Job post published");
        onSaved(job_id, payload);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save this job post.");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof JobForm>(key: K, value: JobForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <DialogHeader className="border-b p-5">
        <DialogTitle>{editing ? "Edit job post" : "Post a job"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Changes show up on the hiring page straight away."
            : "Cohorts will be able to find this and invite you to campus."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Job title">
            <Input
              required
              minLength={5}
              maxLength={50}
              placeholder="e.g. Backend Engineer Intern"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <PickField
              label="Job type"
              value={form.job_type}
              items={jobTypeItems}
              onChange={(v) => set("job_type", v as JobListing["job_type"])}
            />
            <PickField
              label="Workplace"
              value={form.work_place}
              items={workPlaceItems}
              onChange={(v) => set("work_place", v as JobListing["work_place"])}
            />
            <PickField
              label="Category"
              value={form.category}
              items={categoryItems}
              onChange={(v) => set("category", v)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Experience">
              <Input
                required
                placeholder="e.g. 0-1 years"
                value={form.experience}
                onChange={(event) => set("experience", event.target.value)}
              />
            </Field>
            <Field label="Salary">
              <Input
                required
                placeholder="e.g. ৳30,000 - ৳45,000"
                value={form.salary}
                onChange={(event) => set("salary", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Office hours">
              <Input
                required
                placeholder="9am - 6pm"
                value={form.office_hours}
                onChange={(event) => set("office_hours", event.target.value)}
              />
            </Field>
            <Field label="Location">
              <Input
                required
                placeholder="Dhaka, Bangladesh"
                value={form.location}
                onChange={(event) => set("location", event.target.value)}
              />
            </Field>
            <Field label="Vacancies">
              <Input
                required
                type="number"
                min={1}
                value={form.vacancy}
                onChange={(event) => set("vacancy", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              required
              rows={3}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </Field>
          {(
            [
              ["responsibilities", "Responsibilities"],
              ["requirements", "Requirements"],
              ["skills", "Skills"],
              ["benefits", "Benefits"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={`${label} (comma-separated)`}>
              <Input required value={form[key]} onChange={(event) => set(key, event.target.value)} />
            </Field>
          ))}
        </div>
        <DialogFooter className="m-0 rounded-none border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Spinner /> : null}
            {editing ? "Save changes" : "Publish job post"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function JobFormDialog({
  open,
  job,
  accessToken,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** The post being edited, or null to create a new one. */
  job: JobDetail | null;
  accessToken: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (jobId: string, payload: JobCreatePayload) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {open && accessToken ? (
          <JobFormBody
            key={job?.id ?? "new"}
            job={job}
            accessToken={accessToken}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
