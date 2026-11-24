import Link from "next/link";

import { Logo } from "@/components/logo";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { footerAbout, footerAccounts, footerPlatform, type FooterLink } from "@/lib/data";

function FooterColumn({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{footerAbout}</p>
        </div>
        <FooterColumn title="Platform" items={footerPlatform} />
        <FooterColumn title="Accounts" items={footerAccounts} />
      </Container>
      <Separator />
      <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>© UniHire, 2026. All rights reserved.</p>
        <p>Built for graduating cohorts and the recruiters who hire them.</p>
      </Container>
    </footer>
  );
}
