import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";
import { ProductPreview } from "@/components/landing/product-preview";

export function ProductShowcaseSection() {
  return (
    <Section>
      <SectionContainer>
        <SectionHeading
          eyebrow="Inside CareerOS"
          title="See exactly why a resume scores the way it does"
          description="Every analysis breaks down into the same clear structure: an overall score, a per-dimension breakdown, and the specific reasoning behind each one."
        />

        <div className="mt-12">
          <ProductPreview variant="resume-analysis" />
        </div>
      </SectionContainer>
    </Section>
  );
}
