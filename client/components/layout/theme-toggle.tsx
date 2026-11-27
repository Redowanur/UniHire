"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/** Flips between light and dark. The icons swap with CSS, so there is no hydration mismatch. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="size-10 shrink-0 rounded-full"
    >
      <Sun className="size-[1.1rem] dark:hidden" />
      <Moon className="hidden size-[1.1rem] dark:block" />
    </Button>
  );
}
