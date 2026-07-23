import { getCareerBrain } from "@/features/career-brain/brain";
import type { CareerBrain } from "@/features/career-brain/types";
import type { UserDTO } from "@/lib/auth/dto";

import type { CoachContext } from "./types";

/**
 * The Context Engine — Sprint 4: now a pure derivation over the Career
 * Brain (`features/career-brain/brain.ts`), which runs every query this
 * function used to run itself. Same exact `CoachContext` shape as
 * before, so every existing consumer (`/coach`, the dashboard,
 * `CareerRoadmapCard`, etc.) is unaffected.
 */
export function buildCoachContext(brain: CareerBrain): CoachContext {
  const { raw } = brain;

  return {
    user: raw.user,
    resume: {
      count: raw.resumeCount,
      latestResumeId: raw.latestResumeId,
    },
    resumeAnalysis: {
      hasAnalysis: raw.latestAnalysis !== null,
      latestScore: raw.latestAnalysis?.overallScore ?? null,
      latest: raw.latestAnalysis,
    },
    linkedIn: {
      hasAnalysis: raw.linkedInAnalyzed,
    },
    applications: {
      total: raw.applicationAnalytics.totalApplications,
      totalInterviews: raw.applicationAnalytics.totalInterviews,
      totalOffers: raw.applicationAnalytics.totalOffers,
      responseRate: raw.applicationAnalytics.responseRate,
    },
    interview: {
      isReady: raw.latestInterviewPrep !== null,
      href: raw.interviewHref,
    },
    jobs: {
      savedCount: raw.opportunities.length,
      opportunities: raw.opportunities,
    },
    dashboard: {
      recentActivity: raw.recentActivity,
    },
    resumeProfile: raw.resumeProfile,
    hired: {
      achieved: raw.opportunities.some((opportunity) => opportunity.status === "JOINED"),
    },
    onboarding: {
      targetRole: brain.profile.goals.targetRole,
      targetTimeline: brain.profile.goals.targetTimeline,
      urgency: brain.profile.preferences.urgency,
      dreamCompanies: brain.jobIntelligence.dreamCompanies,
      searchPriorities: brain.profile.preferences.searchPriorities,
      existingJobPortals: brain.profile.preferences.existingJobPortals,
      locationSummary: brain.profile.preferences.locationSummary,
    },
    nextStep: raw.nextStep,
  };
}

/** Convenience wrapper for callers that only need `CoachContext` and
 * don't need the full `CareerBrain` object — same signature as before
 * this sprint, so `/coach/page.tsx` needed no changes. Callers that also
 * need the Brain itself (the dashboard, for the Career Agent) should
 * call `getCareerBrain`/`buildCoachContext` directly instead, to avoid
 * computing the Brain twice. */
export async function getCoachContext(user: UserDTO): Promise<CoachContext> {
  return buildCoachContext(await getCareerBrain(user));
}
