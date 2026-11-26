"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AuthShell,
  FormField,
  PasswordInput,
  SubmitButton,
  SwitchAuthLink,
} from "@/components/auth/form-fields";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { access_token, user_type } = await login(email.trim(), password);
      await signIn(access_token, user_type);
      router.push(
        user_type === "admin" ? "/admin" : user_type === "recruiter" ? "/recruiter/dashboard" : "/cohort",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your account to continue"
      footer={
        <SwitchAuthLink
          text="Don't have an account?"
          href="/signup"
          linkText="Sign up"
        />
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
