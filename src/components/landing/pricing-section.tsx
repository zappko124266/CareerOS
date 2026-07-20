import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Section,
  SectionContainer,
  SectionHeading,
} from "@/components/landing/section-container";

/**
 * Real Free-plan limits, passed in from the landing page (a Server
 * Component that can read `PLAN_LIMITS` — the same source of truth the
 * authenticated `/billing` page reads) rather than duplicated or
 * invented here. No dollar price is shown for Pro: this app has no
 * payment processor wired up yet, so a specific price or a "start your
 * trial" CTA would promise a checkout flow that doesn't exist — see
 * `/billing`'s identical disclosure.
 */
export function PricingSection({ freeLimits }: { freeLimits: { label: string; limit: number }[] }) {
  return (
    <Section id="pricing">
      <SectionContainer>
        <SectionHeading
          eyebrow="Pricing"
          title="Start free — real limits, no surprises"
          description="Free comes with real monthly usage on every AI feature, not a locked-down trial. Pro removes the limits; self-serve Pro billing isn't live yet, so there's no price to quote here."
        />

        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-6">
              <div>
                <h3 className="text-lg font-semibold">Free</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Get a real read on your resume and profile — every month, not just once.
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>

              <ul className="flex flex-1 flex-col gap-2.5">
                {freeLimits.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5 text-sm">
                    <Check className="text-foreground mt-0.5 size-4 shrink-0" />
                    <span className="text-foreground/90">
                      {item.label} — {item.limit}/month
                    </span>
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href="/sign-up">Get started for free</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="relative">
            <Card className="ring-foreground/20 h-full ring-2">
              <CardContent className="flex h-full flex-col gap-6">
                <div>
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Unlimited on every AI feature — for when the free monthly limits aren&apos;t
                    enough.
                  </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">Unlimited</span>
                </div>

                <ul className="flex flex-1 flex-col gap-2.5">
                  <li className="flex items-start gap-2.5 text-sm">
                    <Check className="text-foreground mt-0.5 size-4 shrink-0" />
                    <span className="text-foreground/90">
                      No monthly cap on any resume, LinkedIn, application, or career-intelligence
                      feature
                    </span>
                  </li>
                </ul>

                <Button size="lg" variant="outline" className="w-full" disabled>
                  Self-serve billing coming soon
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </SectionContainer>
    </Section>
  );
}
