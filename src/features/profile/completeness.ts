import { getOnboardingStatus } from "@/features/onboarding/service";
import type { OnboardingStep } from "@/features/onboarding/service";
import type { CareerBrain } from "@/features/career-brain/types";

export interface CareerIdentityCompleteness {
  items: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Sprint 13 (Career Identity), requirement 2 — reuses
 * `getOnboardingStatus`'s 3 real, code-checked steps (resume/LinkedIn/
 * saved opportunity existence) as-is rather than re-deriving them, and
 * layers a few more checks purely by reading `CareerBrain.profile`
 * (already fetched, no new query) — every item is a real boolean, never
 * a fabricated weighting or estimate.
 */
export async function computeCareerIdentityCompleteness(
  brain: CareerBrain,
): Promise<CareerIdentityCompleteness> {
  const onboarding = await getOnboardingStatus(brain.userId);
  const { profile } = brain;

  const profileItems: OnboardingStep[] = [
    {
      id: "target-role",
      label: "Set your target role",
      description: "The role CareerOS scores every opportunity and resume suggestion against.",
      completed: Boolean(profile.goals.targetRole),
      href: "/onboarding",
      cta: "Set target role",
    },
    {
      id: "skills",
      label: "Add your skills",
      description: "Read from your most recent parsed resume — re-upload if this looks empty.",
      completed: profile.skills.length > 0,
      href: "/resume",
      cta: "Upload resume",
    },
    {
      id: "experience",
      label: "Add your years of experience",
      description: "Helps CareerOS calibrate whether a listing is junior, mid, or senior for you.",
      completed: profile.yearsOfExperience !== null,
      href: "/onboarding",
      cta: "Add experience",
    },
    {
      id: "location",
      label: "Set your location & work preferences",
      description: "Remote/hybrid/onsite and location drive job matching and discovery.",
      completed: profile.preferences.locationSummary !== null,
      href: "/onboarding",
      cta: "Set preferences",
    },
  ];

  const items = [...onboarding.steps, ...profileItems];
  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percentage: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
  };
}
