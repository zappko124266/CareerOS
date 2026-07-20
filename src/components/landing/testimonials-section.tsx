import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

/**
 * These are illustrative sample quotes, not real user testimonials —
 * CareerOS has no collected customer feedback to publish yet. Clearly
 * labeled as such (heading, description, and a "Sample" badge on every
 * card) rather than presented as real social proof, consistent with this
 * app's standing "never fabricate" discipline applied to marketing copy,
 * not just AI output.
 */
const SAMPLE_QUOTES = [
  "Finally, resume feedback that explains why a section is weak — not just a number.",
  "Caught a keyword gap I never would have spotted scanning the job post myself.",
  "The salary estimate gave me a real number to negotiate from instead of guessing.",
  "It felt like prepping with someone who'd actually read the job description.",
];

export function TestimonialsSection() {
  return (
    <Section id="testimonials" className="bg-muted/30">
      <SectionContainer>
        <SectionHeading
          eyebrow="What to expect"
          title="The kind of feedback CareerOS is built to give"
          description="CareerOS is pre-launch and doesn't have published customer testimonials yet. The quotes below are illustrative samples — written by us to show the tone and specificity of a real analysis, not quotes from real users."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SAMPLE_QUOTES.map((note) => (
            <Card key={note} className="h-full">
              <CardContent className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full">
                    <FileText className="size-3.5" />
                  </div>
                  <Badge variant="outline">Sample</Badge>
                </div>
                <p className="text-foreground/90 flex-1 text-base text-balance">
                  “{note}”
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
