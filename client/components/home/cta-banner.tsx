import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ctaImage } from "@/lib/data";

export function CtaBanner() {
  return (
    <section className="py-14 md:py-20">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl bg-night text-night-foreground">
          <span
            className="absolute -top-16 -left-16 -z-10 size-64 rounded-full bg-primary/40 blur-3xl"
            aria-hidden="true"
          />
          <div className="grid md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-12 lg:p-14">
              <h2 className="text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
                Give your cohort a head start
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-night-foreground/70 md:text-[15px]">
                Verify your university email, join your graduating batch, and start inviting the
                recruiters you actually want on campus.
              </p>
              <div className="mt-8">
                <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                  Create your cohort
                  <ArrowRight />
                </Link>
              </div>
            </div>
            <div className="relative h-56 md:h-auto md:min-h-[300px]">
              <Image
                src={ctaImage.src}
                alt={ctaImage.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-night via-night/30 to-transparent md:bg-gradient-to-r"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
