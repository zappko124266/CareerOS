import { Layers, ShieldCheck, Target, Zap } from "lucide-react";

import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

const BENEFITS = [
  {
    icon: Layers,
    title: "One agent, your whole career",
    description:
      "Resume feedback, LinkedIn optimization, salary benchmarks, and interview prep — unified in a single system instead of a dozen disconnected tools and browser tabs.",
  },
  {
    icon: Target,
    title: "Structured insight, not a chatbot",
    description:
      "Every result is a validated, structured output — not a wall of generic AI text. You get scores, breakdowns, and specific fixes you can act on immediately.",
  },
  {
    icon: Zap,
    title: "From analysis to action",
    description:
      "CareerOS doesn't just tell you something is wrong. It tells you exactly which line to change, which keyword is missing, and why it matters for this role.",
  },
  {
    icon: ShieldCheck,
    title: "Built for your career, not advertisers",
    description:
      "No job listings to scroll, no recruiters to pay for visibility. CareerOS works for the person job hunting — not for the companies hiring.",
  },
];

export function BenefitsSection() {
  return (
    <Section id="benefits">
      <SectionContainer>
        <SectionHeading
          eyebrow="Why CareerOS"
          title="Not a job board. An agent working for you."
          description="CareerOS is built around one idea: your career deserves the same rigor as any other high-stakes decision — backed by structured AI, not guesswork."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex gap-4">
              <div className="bg-foreground text-background flex size-11 shrink-0 items-center justify-center rounded-xl">
                <benefit.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-base">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
