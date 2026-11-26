"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Menu } from "lucide-react";

import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";

function dashboardHref(user: { user_type: string; cohort_id?: string | null }) {
  if (user.user_type === "recruiter") return "/recruiter/dashboard";
  return user.cohort_id ? "/cohort" : "/onboarding/cohort";
}

function initialsOf(name?: string) {
  return (
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}

function NavLinks({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  // The Admin menu is only shown to the logged-in admin
  const links = user?.user_type === "admin" ? [...navLinks, { label: "Admin", href: "/admin" }] : navLinks;
  return (
    <>
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "rounded-lg text-sm font-medium transition-colors",
              mobile ? "px-3 py-3 text-base" : "px-3 py-2",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function LogoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { signOut } = useAuth();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log out?</DialogTitle>
          <DialogDescription>You&apos;ll need to log in again to access your account.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              signOut();
            }}
          >
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserMenu() {
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!user) return null;
  const typeLabel =
    user.user_type === "recruiter" ? "Recruiter" : user.user_type === "student" ? "Student" : "Admin";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="h-11 gap-2.5 rounded-full py-1 pr-3 pl-1" />
        }
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium lg:block">{user.name}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
        <DropdownMenuLabel className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-[11px] font-medium text-primary">{typeLabel}</p>
        </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {user.user_type !== "admin" ? (
          <DropdownMenuItem render={<Link href={dashboardHref(user)} />} className="gap-2 py-2.5">
            <LayoutDashboard className="size-4" />
            Dashboard
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="gap-2 py-2.5">
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <LogoutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}

function AuthArea() {
  const { user, status } = useAuth();
  if (status === "loading") return <Skeleton className="h-10 w-28 rounded-full" />;
  if (user) return <UserMenu />;
  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
        Log in
      </Link>
      <Link href="/signup" className={buttonVariants()}>
        Sign up
      </Link>
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, status } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="icon" aria-label="Open menu" className="md:hidden" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm gap-0 p-0">
        <SheetHeader className="p-5">
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
          <Suspense fallback={null}>
            <NavLinks mobile onNavigate={close} />
          </Suspense>
        </nav>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          {status === "loading" ? (
            <Skeleton className="h-11 w-full" />
          ) : user ? (
            <>
              <div className="mb-2 flex items-center gap-3 rounded-xl bg-muted p-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initialsOf(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {user.user_type !== "admin" ? (
                <Link
                  href={dashboardHref(user)}
                  onClick={close}
                  className={buttonVariants({ size: "lg" })}
                >
                  <LayoutDashboard /> Dashboard
                </Link>
              ) : null}
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  close();
                  setConfirmOpen(true);
                }}
              >
                <LogOut /> Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/signup" onClick={close} className={buttonVariants({ size: "lg" })}>
                Sign up
              </Link>
              <Link
                href="/login"
                onClick={close}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    <LogoutDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
          </nav>
        </div>
        <div className="hidden md:block">
          <AuthArea />
        </div>
        <MobileMenu />
      </Container>
    </header>
  );
}
