import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";

const faqs = [
  {
    q: "Why do I need my university email?",
    a: "A .edu address lets us verify you're a real student and automatically suggest the cohorts for your university and department.",
  },
  {
    q: "Can many classmates join with one invite link?",
    a: "Yes. Invite links are multi-use — share one with your whole batch. You can optionally set an expiry when you create it, and revoke it any time.",
  },
  {
    q: "How do recruiters get involved?",
    a: "Recruiters sign up, verify their account, and see the cohorts that contacted them. They can accept or decline, inspect students, and run an online screening test to shortlist candidates before visiting campus.",
  },
  {
    q: "Is UniHire free?",
    a: "Joining a cohort and inviting recruiters is free for students.",
  },
];

export function Faq() {
  return (
    <section className="py-14 md:py-20">
      <Container className="max-w-3xl">
        <SectionHeader title="Questions, answered" />
        <Accordion className="rounded-2xl border bg-card px-5">
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="py-4 text-base font-medium">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
