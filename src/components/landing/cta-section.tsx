import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/components/landing/section-container";

export function CtaSection() {
  return (
    <section className="py-16 sm:py-20">
      <SectionContainer>
        <div className="bg-foreground text-background flex flex-col items-center gap-6 rounded-2xl px-6 py-14 text-center sm:px-12">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Stop guessing why your resume gets rejected.
          </h2>
          <p className="max-w-lg text-base text-balance opacity-80 sm:text-lg">
            Get your first AI-backed resume analysis in minutes — free, no
            credit card required.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-background text-foreground hover:bg-background/90 w-full sm:w-auto"
          >
            <Link href="/sign-up">
              Get started for free
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </SectionContainer>
    </section>
  );
}
