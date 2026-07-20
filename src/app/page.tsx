import type { Metadata } from "next";

import { BenefitsSection } from "@/components/landing/benefits-section";
import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { PricingSection } from "@/components/landing/pricing-section";
import { ProductShowcaseSection } from "@/components/landing/product-showcase-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { TrustIndicatorsSection } from "@/components/landing/trust-indicators-section";
import { siteConfig } from "@/config/site";
import { METERED_FEATURE_LABEL } from "@/features/entitlements/labels";
import { PLAN_LIMITS } from "@/features/entitlements/service";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// A representative subset of the real Free-plan limits (same source of
// truth as the authenticated `/billing` page), mapped 1:1 to the 5
// capabilities the Features section above already highlights — not all
// 17 metered features, which would be too dense for a marketing card.
const PRICING_HIGHLIGHT_FEATURES = [
  "RESUME_TAILORING",
  "APPLICATION_REVIEW",
  "LINKEDIN_ANALYSIS",
  "SALARY_ESTIMATE",
  "INTERVIEW_PREP",
] as const;

export default function HomePage() {
  const freeLimits = PRICING_HIGHLIGHT_FEATURES.map((feature) => ({
    label: METERED_FEATURE_LABEL[feature],
    limit: PLAN_LIMITS.FREE[feature]!,
  }));

  // Only verifiable facts (name/url/description) — no fabricated
  // aggregateRating or review data, same discipline as the testimonials
  // and pricing fixes above.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan with real monthly usage limits on every feature.",
    },
  };

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <TrustIndicatorsSection />
        <BenefitsSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ProductShowcaseSection />
        <TestimonialsSection />
        <PricingSection freeLimits={freeLimits} />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
