import {
  Briefcase,
  DollarSign,
  IdCard,
  MessageSquareText,
  ScanSearch,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Resume Intelligence",
    description:
      "ATS scoring, keyword gap analysis, and line-by-line strength and weakness detection — grounded in structured, explainable AI output.",
  },
  {
    icon: TrendingUp,
    title: "Career Pathing",
    description:
      "Timeline analysis and progression suggestions that map where your experience can realistically take you next.",
  },
  {
    icon: Briefcase,
    title: "Job & Company Fit",
    description:
      "Match your profile against a specific role and company, with a clear score for how well you actually fit — before you apply.",
  },
  {
    icon: IdCard,
    title: "LinkedIn Optimization",
    description:
      "Headline and About-section rewrites, plus recruiter-visibility and profile SEO analysis, so you get found for the right roles.",
  },
  {
    icon: DollarSign,
    title: "Salary Intelligence",
    description:
      "Structured compensation estimates for your role, level, and market — so you negotiate from data, not guesswork.",
  },
  {
    icon: MessageSquareText,
    title: "Interview Readiness",
    description:
      "A readiness assessment that surfaces the gaps in your story before a recruiter does.",
  },
];

export function FeaturesSection() {
  return (
    <Section id="features" className="bg-muted/30">
      <SectionContainer>
        <SectionHeading
          eyebrow="The AI engine"
          title="Every part of your job search, covered"
          description="Every capability below runs on CareerOS's AI Router and returns structured, validated results — not free-form chatbot replies."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="bg-foreground text-background flex size-10 items-center justify-center rounded-lg">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
