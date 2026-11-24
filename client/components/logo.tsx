import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  inverted = false,
  className,
}: {
  href?: string;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
        <GraduationCap className="size-5" />
      </span>
      <span
        className={cn(
          "text-xl font-semibold tracking-tight",
          inverted ? "text-night-foreground" : "text-foreground",
        )}
      >
        Uni<span className="text-primary">Hire</span>
      </span>
    </Link>
  );
}
