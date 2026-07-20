import { CheckCircle2, ScanSearch, UploadCloud, Wrench } from "lucide-react";

import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your resume",
    description:
      "PDF or DOCX. CareerOS parses it into a structured profile — experience, skills, education — in seconds.",
  },
  {
    icon: ScanSearch,
    title: "Get a structured breakdown",
    description:
      "A real ATS score with a per-dimension breakdown: keyword relevance, formatting, impact language, and more — each with a specific, explained fix.",
  },
  {
    icon: Wrench,
    title: "Act on specific fixes",
    description:
      "Tailor bullets to a real job description, close career gaps, and optimize your LinkedIn profile — every suggestion grounded in your actual resume, never invented.",
  },
  {
    icon: CheckCircle2,
    title: "Track it through to an offer",
    description:
      "Save opportunities, generate application documents, and prep for interviews — all in one system instead of scattered spreadsheets and browser tabs.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <Section id="how-it-works">
      <SectionContainer>
        <SectionHeading
          eyebrow="How it works"
          title="From resume to offer, one system"
          description="No separate tools to stitch together — each step below feeds real, structured data into the next."
        />

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col items-start gap-3">
              <div className="bg-foreground text-background relative flex size-11 shrink-0 items-center justify-center rounded-xl">
                <step.icon className="size-5" />
                <span className="border-background bg-background text-foreground absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border text-[0.65rem] font-semibold">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-base font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
