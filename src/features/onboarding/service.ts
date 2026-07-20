import "server-only";

import { prisma } from "@/lib/prisma";

export interface OnboardingStep {
  id: string;
  label: string;
  /** Why this step matters — shown next to every step, not just the
   * current one, so a user landing mid-flow still understands the whole
   * picture. */
  description: string;
  completed: boolean;
  href: string;
  cta: string;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  /** Zero steps done — the actual first-ever visit, not just "still has
   * some steps left." Drives whether the welcome copy or the progress
   * copy is shown. */
  isBrandNew: boolean;
}

/**
 * Real, code-computed onboarding progress — each step is `completed`
 * based on whether the user actually has the underlying real row
 * (a resume, a LinkedIn profile, a saved opportunity), never a
 * separately-tracked "did they click through this wizard" flag that
 * could drift from what's actually true. No AI call.
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [resumeCount, linkedInProfileCount, opportunityCount] = await Promise.all([
    prisma.resume.count({ where: { userId } }),
    prisma.linkedInProfile.count({ where: { userId } }),
    prisma.opportunity.count({ where: { userId } }),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "resume",
      label: "Upload your resume",
      description:
        "CareerOS reads your real experience from this to ground every score and suggestion — nothing else works well without it.",
      completed: resumeCount > 0,
      href: "/resume",
      cta: "Upload resume",
    },
    {
      id: "linkedin",
      label: "Add your LinkedIn profile",
      description:
        "Paste your profile text to get an SEO score and recruiter-visibility check, and to unlock the Profile Optimization dashboard.",
      completed: linkedInProfileCount > 0,
      href: "/linkedin",
      cta: "Add LinkedIn profile",
    },
    {
      id: "opportunity",
      label: "Save your first opportunity",
      description:
        "Search or paste a job you're interested in — CareerOS scores your fit and tracks it through to an offer.",
      completed: opportunityCount > 0,
      href: "/opportunities",
      cta: "Find opportunities",
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
    isBrandNew: completedCount === 0,
  };
}
