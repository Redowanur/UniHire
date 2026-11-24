import { Briefcase, GraduationCap, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";

const steps = [
  {
    icon: GraduationCap,
    title: "Verify your university email",
    description:
      "Sign up with your .edu address so we can confirm you're a real student at a real university.",
  },
  {
    icon: Users,
    title: "Join or start your cohort",
    description:
      "Find your graduating batch by department, or create one and invite classmates with a shareable link.",
  },
  {
    icon: Briefcase,
    title: "Invite recruiters to campus",
    description:
      "Browse who's hiring, send a campus invite, and run a screening test to shortlist candidates once they accept.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-secondary/50 py-14 md:py-20">
      <Container>
        <SectionHeader
          title="From sign-up to campus visit"
          description="Three steps connect a graduating cohort with the recruiters worth bringing to their university."
        />
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="relative h-full">
                <CardContent className="flex flex-col gap-4">
                  <span className="absolute top-4 right-5 text-5xl font-bold text-primary/10">
                    {index + 1}
                  </span>
                  <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                    <step.icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
