"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

export function FormField({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="font-semibold">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

export function SubmitButton({
  loading,
  icon,
  children,
  className,
}: {
  loading: boolean;
  /** Leading icon shown when not loading; swapped for a spinner while loading. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={loading} className={cn("w-full gap-2", className)}>
      {loading ? <Spinner /> : icon}
      {children}
    </Button>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-secondary/40 px-4 py-10 md:py-16">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className={cn("mx-auto w-full", wide ? "max-w-2xl" : "max-w-md")}>
        <Card className="animate-fade-up shadow-xl shadow-primary/5">
          <CardContent>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            {footer ? (
              <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Fixed "+880" prefix with a 10-digit-only input; value/onChange carry just the digits. */
export function PhoneField({
  id,
  value,
  onChange,
  required = true,
}: {
  id?: string;
  value: string;
  onChange: (digits: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex h-10 w-full items-center rounded-xl border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <span className="flex h-full shrink-0 items-center rounded-l-xl border-r bg-muted px-3 text-sm font-medium text-muted-foreground select-none">
        +880
      </span>
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        maxLength={10}
        pattern="[0-9]{10}"
        placeholder="1XXXXXXXXX"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
        className="h-full min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}

/** shadcn Select wrapper for simple {id, name} option lists. */
export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const items = options.map((o) => ({ value: o.id, label: o.name }));
  return (
    <Select
      value={value || null}
      onValueChange={(v) => onChange(v ?? "")}
      items={items}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SwitchAuthLink({
  text,
  href,
  linkText,
}: {
  text: string;
  href: string;
  linkText: string;
}) {
  return (
    <>
      {text}{" "}
      <Link href={href} className="font-semibold text-primary transition-colors hover:text-primary/80">
        {linkText}
      </Link>
    </>
  );
}

/** Password input with a show/hide eye toggle. */
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground cursor-pointer"
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
