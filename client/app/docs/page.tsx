import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  collections,
  endpointGroups,
  envClient,
  envServer,
  gotchas,
} from "@/lib/docs-data";

export const metadata: Metadata = {
  title: "Developer docs | UniHire",
  description: "Architecture, setup, configuration and API reference for UniHire developers.",
};

const toc = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Run it" },
  { id: "config", label: "Configuration" },
  { id: "data", label: "Data model" },
  ...endpointGroups.map((g) => ({ id: g.id, label: g.title })),
  { id: "rules", label: "Key rules" },
  { id: "live", label: "Live monitoring" },
  { id: "issues", label: "Known issues" },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-muted px-4 py-3 text-xs leading-6">
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

const methodTone: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  POST: "bg-primary/15 text-primary",
  PATCH: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  DELETE: "bg-destructive/15 text-destructive",
  WS: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

function KeyValueTable({ rows, head }: { rows: [string, string][]; head: [string, string] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{head[0]}</TableHead>
            <TableHead>{head[1]}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell className="align-top font-mono text-xs whitespace-normal">{k}</TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">{v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Container className="py-10 md:py-14">
      <div className="mb-10 max-w-3xl">
        <Badge variant="secondary">Developers</Badge>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">UniHire developer docs</h1>
        <p className="mt-3 text-muted-foreground md:text-lg">
          How the platform is built, how to run it, and what the API does. The full write-up lives in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">DOCUMENTATION.md</code> at the repo root.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {toc.map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-14">
          <Section id="overview" title="Overview">
            <p className="text-muted-foreground">
              Students form cohorts by university and department, then invite recruiters to campus through job
              posts. A recruiter who accepts can see the cohort roster and run scheduled, proctored screening tests.
              One admin account, seeded from the environment, maintains the university and department lists.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Frontend", "Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui on Base UI. Bun."],
                ["Backend", "FastAPI with Beanie over MongoDB 7 (database placement_portal). JWT auth, argon2."],
                ["Same origin", "Next rewrites /api/v1/* to the API, so phones and tunnels need no CORS or second port."],
              ].map(([t, d]) => (
                <Card key={t}>
                  <CardContent className="space-y-1.5">
                    <p className="font-semibold">{t}</p>
                    <p className="text-sm text-muted-foreground">{d}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Code>{`Browser -> Next.js :3000 --/api/v1/* rewrite--> FastAPI :8000 -> MongoDB
Browser <== WebRTC media (student -> recruiter) ==> peer to peer; API relays signaling only`}</Code>
          </Section>

          <Section id="setup" title="Run it">
            <p className="text-sm text-muted-foreground">Everything in Docker (stop local dev servers first; same ports):</p>
            <Code>{`docker compose up -d --build
# after editing server/.env:
docker compose up -d --force-recreate server`}</Code>
            <p className="text-sm text-muted-foreground">Or locally:</p>
            <Code>{`docker compose up -d mongodb                     # Mongo on localhost:27018

cd server && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000            # /docs, /health

cd client && bun install && bun run dev          # http://localhost:3000`}</Code>
            <p className="text-sm text-muted-foreground">
              Checks: <code>npx tsc --noEmit</code>, <code>npx eslint .</code>, <code>bun run build</code>. Log in as
              the admin to add the first university and department.
            </p>
          </Section>

          <Section id="config" title="Configuration">
            <h3 className="font-semibold">server/.env</h3>
            <KeyValueTable rows={envServer} head={["Variable", "Notes"]} />
            <h3 className="font-semibold">client (build args and env)</h3>
            <KeyValueTable rows={envClient} head={["Variable", "Notes"]} />
          </Section>

          <Section id="data" title="Data model">
            <KeyValueTable rows={collections} head={["Collection", "Notes"]} />
          </Section>

          {endpointGroups.map((group) => (
            <Section key={group.id} id={group.id} title={group.title}>
              {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Auth</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.endpoints.map((e) => (
                      <TableRow key={e.method + e.path}>
                        <TableCell className="align-top">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${methodTone[e.method] ?? ""}`}>
                            {e.method}
                          </span>
                        </TableCell>
                        <TableCell className="align-top font-mono text-xs break-all whitespace-normal">
                          {e.path}
                        </TableCell>
                        <TableCell className="align-top text-xs whitespace-normal">{e.auth}</TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">{e.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>
          ))}

          <Section id="rules" title="Key rules">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Unverified students can&apos;t use cohorts; unverified recruiters can&apos;t post jobs or receive invites.</li>
              <li>Invite links are multi-use. Expired links are deleted by a MongoDB TTL index and purged on every read. Revoking deletes the link.</li>
              <li>A test closes for everyone at start + duration. /start is refused before and after the window, once submitted, or if terminated.</li>
              <li>Answers are keyed by question id, so each student&apos;s shuffle can&apos;t mis-score. Three violations end the exam.</li>
              <li>Editing a test: ended is locked; questions lock once any attempt exists; a live test&apos;s start can&apos;t move. Schedule or question changes re-email the cohort.</li>
              <li>Jobs: category is a free string; the salary filter uses salary_min and salary_max parsed from the text, so unparsed jobs drop out when it is active.</li>
            </ul>
          </Section>

          <Section id="live" title="Live monitoring">
            <p className="text-sm text-muted-foreground">
              Students send camera and microphone straight to the recruiter&apos;s browser over WebRTC. The API&apos;s
              WebSocket relays only offer, answer and ICE messages; no media touches the server and nothing is
              recorded. The first socket message must be an auth message with the access token (keeps it out of
              URLs). Close code 4401 means bad auth, 4403 means not allowed. Client code is in{" "}
              <code>client/lib/live.ts</code>; the server hub is <code>server/services/live_hub.py</code>.
            </p>
          </Section>

          <Section id="issues" title="Known issues">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {gotchas.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </Container>
  );
}
