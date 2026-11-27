import { Suspense } from "react";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UniHire | Bring recruiters to your campus",
  description:
    "UniHire connects graduating cohorts with recruiters — join your cohort, invite companies to campus, and shortlist with screening tests.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full", "antialiased", outfit.variable, "font-sans")}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">
              <Suspense fallback={children}>
                <PageTransition>{children}</PageTransition>
              </Suspense>
            </main>
            <Footer />
          </AuthProvider>
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
