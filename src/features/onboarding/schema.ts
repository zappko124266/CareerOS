import { z } from "zod";

/** Career Stage, Target Role & Goals, Location & Work, Skills,
 * Compensation & Employment Type, Company Preferences, Review — index 0-6.
 * The actual per-step *data* is validated by the existing
 * `DiscoveryPreferenceInputSchema` / `UpdateCareerGoalInputSchema` (the
 * wizard reuses those directly); this is only the step-position bookkeeping. */
export const ONBOARDING_TOTAL_STEPS = 7;

export const OnboardingProgressInputSchema = z.object({
  step: z.number().int().min(0).max(ONBOARDING_TOTAL_STEPS),
});
