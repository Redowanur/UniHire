"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthShell, FormField, PasswordInput, SubmitButton } from "@/components/auth/form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, resetPassword } from "@/lib/api";

const CODE_LIFETIME_SECONDS = 10 * 60;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CODE_LIFETIME_SECONDS);

  useEffect(() => {
    if (step !== "reset" || secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const expired = step === "reset" && secondsLeft <= 0;

  async function handleRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { message } = await requestPasswordReset(email.trim().toLowerCase());
      toast.success(message);
      setStep("reset");
      setSecondsLeft(CODE_LIFETIME_SECONDS);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      const { message } = await requestPasswordReset(email.trim().toLowerCase());
      toast.success(message);
      setCode("");
      setSecondsLeft(CODE_LIFETIME_SECONDS);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (expired) {
      toast.error("That code has expired. Request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { message } = await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      toast.success(message);
      router.push("/login");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <AuthShell title="Forgot password" subtitle="We'll email you a code to reset it">
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <FormField label="Email" htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          <SubmitButton loading={loading}>Send reset code</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter your code"
      subtitle={
        <>
          Sent to <span className="font-semibold text-foreground">{email}</span>
        </>
      }
    >
      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <FormField label="6-digit code" htmlFor="reset-code">
          <Input
            id="reset-code"
            type="text"
            inputMode="numeric"
            required
            minLength={6}
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-12 text-center text-xl tracking-[0.5em]"
          />
        </FormField>

        <div className="-mt-2 flex justify-center">
          {expired ? (
            <Badge variant="destructive">Code expired</Badge>
          ) : (
            <Badge variant="secondary" className="tabular-nums">
              Expires in {formatCountdown(secondsLeft)}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="New password" htmlFor="reset-password">
            <PasswordInput
              id="reset-password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </FormField>
          <FormField label="Confirm password" htmlFor="reset-confirm-password">
            <PasswordInput
              id="reset-confirm-password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </FormField>
        </div>

        <SubmitButton loading={loading} className={expired ? "pointer-events-none opacity-60" : undefined}>
          Reset password
        </SubmitButton>

        {expired ? (
          <Button type="button" variant="ghost" onClick={handleResend} disabled={loading}>
            Resend code
          </Button>
        ) : null}
      </form>
    </AuthShell>
  );
}
