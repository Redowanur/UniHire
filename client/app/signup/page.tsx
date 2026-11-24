"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import {
  AuthShell,
  FormField,
  PhoneField,
  SubmitButton,
  SelectField,
  SwitchAuthLink,
} from "@/components/auth/form-fields";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchUniversities,
  fetchDepartments,
  login,
  sendVerificationEmail,
  signUpRecruiter,
  signUpStudent,
  type University,
} from "@/lib/api";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/* --------------------------------- */
/* Student sign up                   */
/* --------------------------------- */

function StudentSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    reg_no: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [universities, setUniversities] = useState<University[]>([]);
  const [departments, setDepartments] = useState<University[]>([]);
  const [uniId, setUniId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUniversities()
      .then((data) => {
        if (!cancelled) setUniversities(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load universities. Refresh to try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uniId) return;
    let cancelled = false;
    fetchDepartments(uniId)
      .then((data) => {
        if (!cancelled) setDepartments(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load departments. Try selecting again.");
      });
    return () => {
      cancelled = true;
    };
  }, [uniId]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpStudent({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        reg_no: Number(form.reg_no),
        password: form.password,
        dept_id: deptId,
        uni_id: uniId,
        phone: form.phone.trim(),
      });

      // Auto login after a successful registration
      const { access_token, user_type } = await login(form.email.trim(), form.password);
      await signIn(access_token, user_type);

      // Fire and forget — email verification link
      sendVerificationEmail(access_token).catch(() => {
        // Verification can be requested again later from the app
      });

      router.push(searchParams.get("next") || "/onboarding/cohort");
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Full name" htmlFor="student-name">
        <Input
          id="student-name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="Your name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="student-email">
          <Input
            id="student-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@university.edu"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </FormField>
        <FormField label="Registration no." htmlFor="student-regno">
          <Input
            id="student-regno"
            type="number"
            required
            min={1}
            placeholder="e.g. 202314010"
            value={form.reg_no}
            onChange={(event) => update("reg_no", event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="University" htmlFor="student-university">
          <SelectField
            id="student-university"
            value={uniId}
            placeholder="Select university"
            options={universities}
            required
            onChange={(value) => {
              setUniId(value);
              // Reset the dependent department selection
              setDepartments([]);
              setDeptId("");
            }}
          />
        </FormField>
        <FormField label="Department" htmlFor="student-department">
          <SelectField
            id="student-department"
            value={deptId}
            placeholder={uniId ? "Select department" : "Pick university first"}
            options={departments}
            disabled={!uniId}
            required
            onChange={setDeptId}
          />
        </FormField>
      </div>

      <FormField label="Phone" htmlFor="student-phone">
        <PhoneField id="student-phone" value={form.phone} onChange={(v) => update("phone", v)} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="student-password">
          <Input
            id="student-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </FormField>
        <FormField label="Confirm password" htmlFor="student-confirm-password">
          <Input
            id="student-confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
          />
        </FormField>
      </div>

      <SubmitButton loading={loading} icon={<GraduationCap className="size-4.5" />}>
        Create student account
      </SubmitButton>
    </form>
  );
}

/* --------------------------------- */
/* Recruiter sign up                 */
/* --------------------------------- */

function RecruiterSignUpForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    company_name: "",
    designation: "",
  });
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUpRecruiter({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        company_name: form.company_name.trim(),
        designation: form.designation.trim(),
      });

      // Auto login after a successful registration
      const { access_token, user_type } = await login(form.email.trim(), form.password);
      await signIn(access_token, user_type);

      // Fire and forget — email verification link
      sendVerificationEmail(access_token).catch(() => {
        // Verification can be requested again later from the app
      });

      router.push("/recruiter/dashboard");
    } catch (err) {
      toast.error(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Full name" htmlFor="recruiter-name">
        <Input
          id="recruiter-name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="Your name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Work email" htmlFor="recruiter-email">
          <Input
            id="recruiter-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </FormField>
        <FormField label="Phone" htmlFor="recruiter-phone">
          <PhoneField id="recruiter-phone" value={form.phone} onChange={(v) => update("phone", v)} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company name" htmlFor="recruiter-company">
          <Input
            id="recruiter-company"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="Must be a registered company"
            value={form.company_name}
            onChange={(event) => update("company_name", event.target.value)}
          />
        </FormField>
        <FormField label="Designation" htmlFor="recruiter-designation">
          <Input
            id="recruiter-designation"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="e.g. HR Manager"
            value={form.designation}
            onChange={(event) => update("designation", event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="recruiter-password">
          <Input
            id="recruiter-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </FormField>
        <FormField label="Confirm password" htmlFor="recruiter-confirm-password">
          <Input
            id="recruiter-confirm-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
          />
        </FormField>
      </div>

      <SubmitButton loading={loading} icon={<Building2 className="size-4.5" />}>
        Create recruiter account
      </SubmitButton>
    </form>
  );
}

/* --------------------------------- */
/* Page                              */
/* --------------------------------- */

export default function SignupPage() {
  return (
    <AuthShell
      wide
      title="Create your account"
      subtitle="Pick your role and join our community"
      footer={
        <SwitchAuthLink text="Already have an account?" href="/login" linkText="Log in" />
      }
    >
      <Tabs defaultValue="student">
        <TabsList aria-label="Account type" className="mb-5 grid w-full grid-cols-2 group-data-horizontal/tabs:h-11">
          <TabsTrigger value="student">
            <GraduationCap className="size-4.5" />
            Student
          </TabsTrigger>
          <TabsTrigger value="recruiter">
            <Building2 className="size-4.5" />
            Recruiter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="animate-overlay-in">
          <Suspense fallback={null}>
            <StudentSignUpForm />
          </Suspense>
        </TabsContent>
        <TabsContent value="recruiter" className="animate-overlay-in">
          <RecruiterSignUpForm />
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}
