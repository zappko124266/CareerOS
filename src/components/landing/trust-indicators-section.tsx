import { Lock, ShieldCheck, Sparkles } from "lucide-react";

import { SectionContainer } from "@/components/landing/section-container";

/**
 * Kept to claims verifiable from this app's own architecture — no
 * unverifiable badges (e.g. compliance certifications this app doesn't
 * have). "Private by default" and "Secure uploads" describe the real
 * storage/access-control model; "AI-assisted, always explainable"
 * describes the real AI Router's structured-output convention used
 * throughout the product.
 */
const TRUST_INDICATORS = [
  {
    icon: Lock,
    label: "Private by default",
    description: "Your resumes and data are scoped to your account, never sold to third parties.",
  },
  {
    icon: Sparkles,
    label: "AI-assisted, always explainable",
    description: "Every score comes with a structured reason — never an unexplained number.",
  },
  {
    icon: ShieldCheck,
    label: "Secure resume uploads",
    description: "Files are stored behind authenticated, per-account access controls.",
  },
] as const;

export function TrustIndicatorsSection() {
  return (
    <div className="border-y py-8 sm:py-10">
      <SectionContainer>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {TRUST_INDICATORS.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </div>
  );
}
