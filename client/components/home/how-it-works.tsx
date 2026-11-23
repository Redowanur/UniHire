import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Icon, type IconName } from "@/components/icon";

const steps: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "graduation-cap",
    title: "Verify your university email",
    description:
      "Sign up with your .edu address so we can confirm you're a real student at a real university.",
  },
  {
    icon: "users",
    title: "Join or start your cohort",
    description:
      "Find your graduating batch by department, or create one and invite classmates with a shareable link.",
  },
  {
    icon: "briefcase",
    title: "Invite recruiters to campus",
    description:
      "Browse who's hiring, send a campus invite, and run a screening test to shortlist candidates once they accept.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface py-14 md:py-20">
      <Container>
        <SectionHeader
          title="From sign-up to campus visit"
          description="Three steps connect a graduating cohort with the recruiters worth bringing to their university."
        />

        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-card"
            >
              <span className="absolute right-5 top-5 font-display text-4xl font-bold text-primary-100">
                {index + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-xl bg-primary-500 text-white">
                <Icon name={step.icon} className="size-5.5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold text-heading">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-body">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
