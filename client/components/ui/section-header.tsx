import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  align = "center",
  action,
  className,
}: {
  title: string;
  description?: string;
  align?: "center" | "left";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 md:mb-10",
        align === "center" ? "text-center" : "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className={cn(align === "center" && "mx-auto", "max-w-2xl")}>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function LinkArrow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/link inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-200 group-hover/link:translate-x-0.5" />
    </Link>
  );
}
