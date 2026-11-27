"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light by default; the header toggle switches to dark. Stored in localStorage and applied as the `dark` class on <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
