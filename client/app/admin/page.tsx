"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { notFound, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import {
  createDepartment,
  createUniversity,
  fetchDepartments,
  fetchUniversities,
    type University,
} from "@/lib/api";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="font-semibold">{label}</Label>
      {children}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, status, accessToken } = useAuth();

  const [universities, setUniversities] = useState<University[] | null>(null);
  const [departments, setDepartments] = useState<University[]>([]);

  const [uniName, setUniName] = useState("");
  const [creatingUni, setCreatingUni] = useState(false);

  const [deptName, setDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);

  const isAdmin = user?.user_type === "admin";

  const load = useCallback(async () => {
    try {
      const [unis, depts] = await Promise.all([fetchUniversities(), fetchDepartments()]);
      setUniversities(unis);
      setDepartments(depts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load universities.");
      setUniversities([]);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([fetchUniversities(), fetchDepartments()])
      .then(([unis, depts]) => {
        if (cancelled) return;
        setUniversities(unis);
        setDepartments(depts);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "Couldn't load universities.");
        setUniversities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Everyone except the admin sees a 404 — the page is not advertised anywhere
  if (status === "authenticated" && !isAdmin) notFound();

  if (status !== "authenticated" || !user || universities === null) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  async function handleCreateUniversity(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setCreatingUni(true);
    try {
      await createUniversity(uniName.trim(), accessToken);
      toast.success(`Added ${uniName.trim()}`);
      setUniName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the university.");
    } finally {
      setCreatingUni(false);
    }
  }

  async function handleCreateDepartment(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setCreatingDept(true);
    try {
      await createDepartment(deptName.trim(), accessToken);
      toast.success(`Added ${deptName.trim()}`);
      setDeptName("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the department.");
    } finally {
      setCreatingDept(false);
    }
  }

  return (
    <div className="bg-secondary/40 py-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the universities and departments students can choose when they sign up.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add a university</CardTitle>
              <CardDescription>It appears on the student sign-up form.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUniversity} className="space-y-4">
                <Field label="University name">
                  <Input
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Shahjalal University of Science and Technology"
                    value={uniName}
                    onChange={(event) => setUniName(event.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={creatingUni || !uniName.trim()} className="gap-2">
                  {creatingUni ? <Spinner /> : null}
                  Add university
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add a department</CardTitle>
              <CardDescription>Departments are shared by every university.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <Field label="Department name">
                  <Input
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Computer Science and Engineering"
                    value={deptName}
                    onChange={(event) => setDeptName(event.target.value)}
                  />
                </Field>
                <Button
                  type="submit"
                  disabled={creatingDept || !deptName.trim()}
                  className="gap-2"
                >
                  {creatingDept ? <Spinner /> : null}
                  Add department
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Universities</CardTitle>
              <CardDescription>{universities.length} listed</CardDescription>
            </CardHeader>
            <CardContent>
              <NameList items={universities} empty="No universities yet." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>{departments.length} listed</CardDescription>
            </CardHeader>
            <CardContent>
              <NameList items={departments} empty="No departments yet." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NameList({ items, empty }: { items: University[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="max-h-96 space-y-1.5 overflow-y-auto pr-1 text-sm">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg bg-muted/60 px-3 py-1.5">
          {item.name}
        </li>
      ))}
    </ul>
  );
}
