"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useRef } from "react";

import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { useAuth } from "@/hooks/use-auth";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";

function NavLinks({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {navLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "text-sm font-medium transition-colors",
              mobile ? "rounded-lg px-3 py-2.5" : undefined,
              active
                ? mobile
                  ? "bg-white/5 text-primary-400"
                  : "text-primary-400"
                : mobile
                  ? "text-white/75 hover:bg-white/5 hover:text-white"
                  : "text-white/70 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function NavLinksFallback({ mobile }: { mobile?: boolean }) {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className={cn(
            "text-sm font-medium transition-colors",
            mobile ? "rounded-lg px-3 py-2.5 text-white/75 hover:bg-white/5 hover:text-white" : "text-white/70 hover:text-white",
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

function dashboardHref(user: { user_type: string; cohort_id?: string | null }) {
  if (user.user_type === "recruiter") return "/recruiter/dashboard";
  return user.cohort_id ? "/cohort" : "/onboarding/cohort";
}

function AuthArea({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { user, status, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // While the session is being restored, render nothing to avoid flashing
  if (status === "loading") {
    return mobile ? <div className="h-10" /> : <div className="h-9 w-24" />;
  }

  if (!user) {
    return (
      <div className={cn("flex gap-3", mobile ? "w-full" : "hidden md:flex gap-6 items-center")}>
        <Link
          href="/login"
          onClick={onNavigate}
          className={cn(
            "text-sm font-medium text-white/80 transition-colors hover:text-white",
            mobile && "flex-1 rounded-full border border-white/20 py-2.5 text-center hover:bg-white/5",
          )}
        >
          Login
        </Link>
        <Link
          href="/signup"
          onClick={onNavigate}
          className={cn(
            "rounded-lg bg-primary-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-primary-600",
            mobile && "flex-1 rounded-full text-center",
          )}
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const typeLabel =
    user.user_type === "recruiter" ? "Recruiter" : user.user_type === "student" ? "Student" : "Admin";

  if (mobile) {
    return (
      <div className="flex w-full flex-col gap-2">
        <Link
          href={dashboardHref(user)}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-full bg-primary-500 py-2.5 text-center text-sm font-semibold text-white"
        >
          <LayoutDashboard className="size-4" />
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            signOut();
          }}
          className="flex items-center justify-center gap-2 rounded-full border border-white/20 py-2.5 text-sm font-medium text-white/80"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="relative hidden md:block"
      onBlur={(event) => {
        if (!menuRef.current?.contains(event.relatedTarget as Node)) setMenuOpen(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-full border border-white/15 py-1.5 pl-1.5 pr-3 text-left transition-colors hover:border-white/30 hover:bg-white/5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-500 text-sm font-bold text-white">
          {initials || "U"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
          <span className="block text-[11px] font-medium text-primary-300">{typeLabel}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/60 transition-transform duration-200",
            menuOpen && "rotate-180",
          )}
        />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="animate-overlay-in absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-night-950/15"
        >
          <div className="border-b border-line bg-surface px-4 py-3">
            <p className="truncate text-sm font-semibold text-heading">{user.name}</p>
            <p className="truncate text-xs text-body">{user.email}</p>
          </div>
          <Link
            href={dashboardHref(user)}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-body transition-colors hover:bg-surface hover:text-heading"
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-body transition-colors hover:bg-surface hover:text-heading focus-visible:bg-surface focus-visible:text-heading focus-visible:outline-none"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-night-950/95 text-white backdrop-blur">
      <Container className="flex h-16 items-center justify-between md:h-20">
        <Logo inverted />

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <AuthArea />
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation"
          className="grid size-10 place-items-center rounded-lg border border-white/15 text-white md:hidden"
        >
          <Icon name={open ? "close" : "menu"} className="size-5" />
        </button>
      </Container>

      {open ? (
        <div
          id="mobile-menu"
          className="border-t border-white/10 bg-night-950 md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            <Suspense fallback={<NavLinksFallback mobile />}>
              <NavLinks mobile onNavigate={() => setOpen(false)} />
            </Suspense>
            <div className="mt-3 border-t border-white/10 pt-4">
              <AuthArea
                mobile
                onNavigate={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
