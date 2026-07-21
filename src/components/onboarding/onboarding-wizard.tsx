"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateDiscoveryPreferenceAction } from "@/actions/discovery";
import { updateCareerGoalAction } from "@/actions/career";
import {
  completeOnboardingAction,
  saveOnboardingProgressAction,
} from "@/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingStepper, type OnboardingStepMeta } from "@/components/onboarding/onboarding-stepper";
import { CareerStageStep } from "@/components/onboarding/steps/career-stage-step";
import { CompaniesStep } from "@/components/onboarding/steps/companies-step";
import { CompensationStep } from "@/components/onboarding/steps/compensation-step";
import { LocationStep } from "@/components/onboarding/steps/location-step";
import { ReviewStep } from "@/components/onboarding/steps/review-step";
import { SkillsStep } from "@/components/onboarding/steps/skills-step";
import { TargetRoleStep, type CareerGoalDraft } from "@/components/onboarding/steps/target-role-step";
import { buildDiscoveryPreferenceFormValue } from "@/features/discovery/types";
import type { DiscoveryPreferenceInput } from "@/features/discovery/types";
import type { CareerGoal, DiscoveryPreference } from "@/generated/prisma/client";

const STEPS: OnboardingStepMeta[] = [
  { id: "career-stage", title: "Career Stage" },
  { id: "target-role", title: "Target Role & Goals" },
  { id: "location", title: "Location & Work" },
  { id: "skills", title: "Skills" },
  { id: "compensation", title: "Compensation" },
  { id: "companies", title: "Companies" },
  { id: "review", title: "Review" },
];

const LAST_STEP = STEPS.length - 1;

function buildGoalDraft(goal: CareerGoal | null): CareerGoalDraft {
  return {
    targetRole: goal?.targetRole ?? "",
    targetTimeline: goal?.targetTimeline ?? "",
  };
}

export function OnboardingWizard({
  initialPreference,
  initialCareerGoal,
  initialStep,
}: {
  initialPreference: DiscoveryPreference | null;
  initialCareerGoal: CareerGoal | null;
  initialStep: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(initialStep, LAST_STEP));
  const [draft, setDraft] = useState<DiscoveryPreferenceInput>(
    buildDiscoveryPreferenceFormValue(initialPreference),
  );
  const [goal, setGoal] = useState<CareerGoalDraft>(buildGoalDraft(initialCareerGoal));
  const [saving, setSaving] = useState(false);

  /** Auto-save (Step "Save progress automatically") — reuses the existing
   * Discovery Preference / Career Goal actions unchanged; this wizard
   * never writes to Prisma directly. */
  async function persist(atStep: number) {
    const [preferenceResult, goalResult] = await Promise.all([
      updateDiscoveryPreferenceAction({
        ...draft,
        preferredRoles: draft.preferredRoles.map((role) => role.trim()).filter(Boolean),
      }),
      updateCareerGoalAction({
        targetRole: draft.preferredRoles[0] || goal.targetRole || undefined,
        targetTimeline: goal.targetTimeline || undefined,
      }),
      saveOnboardingProgressAction({ step: atStep }),
    ]);

    if (preferenceResult.status === "error") {
      toast.error(preferenceResult.message);
      return false;
    }
    if (goalResult.status === "error") {
      toast.error(goalResult.message);
      return false;
    }
    return true;
  }

  async function goToStep(nextStep: number) {
    setSaving(true);
    const ok = await persist(nextStep);
    setSaving(false);
    if (ok) setStep(nextStep);
  }

  async function handleNext() {
    await goToStep(Math.min(step + 1, LAST_STEP));
  }

  async function handleBack() {
    await goToStep(Math.max(step - 1, 0));
  }

  async function handleFinish() {
    setSaving(true);
    const ok = await persist(LAST_STEP);
    if (ok) {
      const result = await completeOnboardingAction();
      if (result.status === "success") {
        toast.success("You're all set.");
        router.push("/dashboard");
        return;
      }
      toast.error(result.message);
    }
    setSaving(false);
  }

  const isReview = step === LAST_STEP;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="sr-only">Get Started with CareerOS</h1>
      <OnboardingStepper steps={STEPS} currentIndex={step} />

      <Card>
        <CardContent className="flex flex-col gap-6 py-6">
          {step === 0 && <CareerStageStep value={draft} onChange={setDraft} />}
          {step === 1 && (
            <TargetRoleStep value={draft} onChange={setDraft} goal={goal} onGoalChange={setGoal} />
          )}
          {step === 2 && <LocationStep value={draft} onChange={setDraft} />}
          {step === 3 && <SkillsStep value={draft} onChange={setDraft} />}
          {step === 4 && <CompensationStep value={draft} onChange={setDraft} />}
          {step === 5 && <CompaniesStep value={draft} onChange={setDraft} />}
          {isReview && <ReviewStep value={draft} goal={goal} onJumpToStep={setStep} />}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0 || saving}>
              Back
            </Button>
            {isReview ? (
              <Button type="button" onClick={handleFinish} disabled={saving}>
                {saving ? "Finishing…" : "Finish"}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} disabled={saving}>
                {saving ? "Saving…" : "Next"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
