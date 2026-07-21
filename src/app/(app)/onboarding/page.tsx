import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCareerGoal } from "@/features/career/queries";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Get Started" };

/**
 * The Career Onboarding wizard's route. Reads whatever's already saved on
 * `DiscoveryPreference`/`CareerGoal` (the same rows the Discovery
 * Preferences panel and Career Goal features already read/write) so the
 * wizard resumes exactly where the user left off — no separate "draft"
 * storage.
 */
export default async function OnboardingPage() {
  const user = await verifySession();
  const [preference, careerGoal] = await Promise.all([
    getDiscoveryPreference(user.id),
    getCareerGoal(user.id),
  ]);

  if (preference?.onboardingCompletedAt) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="text-primary size-10" />
            <h1 className="font-medium">You&apos;ve already finished onboarding</h1>
            <p className="text-muted-foreground text-sm">
              You can still update any of these answers from Settings.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <OnboardingWizard
      initialPreference={preference}
      initialCareerGoal={careerGoal}
      initialStep={preference?.onboardingStep ?? 0}
    />
  );
}
