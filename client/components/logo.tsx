import Image from "next/image";
import Link from "next/link";

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
      <Image
        src="/logo-mark.png"
        alt=""
        width={40}
        height={40}
        priority
        className="size-10 shrink-0 object-contain"
      />
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
