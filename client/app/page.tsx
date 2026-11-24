import { Hero } from "@/components/home/hero";
import { HiringFeed } from "@/components/home/hiring-feed";
import { HowItWorks } from "@/components/home/how-it-works";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HiringFeed />
      <HowItWorks />
      <Faq />
      <CtaBanner />
    </>
  );
}
