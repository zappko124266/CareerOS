import { getCareerGoal } from "@/features/career/queries";
import { computeApplicationAnalytics } from "@/features/analytics/service";
import { getDashboardData } from "@/features/dashboard/queries";
import { buildLocationSummary } from "@/features/discovery/types";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { getLatestInterviewPrepForUser } from "@/features/interviews/queries";
import { getLatestLinkedInAnalysis } from "@/features/linkedin-profile/queries";
import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import type { UserDTO } from "@/lib/auth/dto";

import { recommendNextStep } from "./recommend-next-step";
import type { CoachContext } from "./types";

/**
 * The Context Engine. Gathers every existing signal the Coach needs into
 * one object — Resume, Resume Analysis, LinkedIn, Applications,
 * Interview, Jobs, Dashboard, Onboarding, and the real-progress Next
 * Recommended Step — by calling the exact same queries/services already
 * used by the dashboard, applications list, analytics pages, and the
 * onboarding wizard itself. No new query beyond reusing
 * `getDiscoveryPreference`/`getCareerGoal` (Sprint 1's onboarding
 * queries), no new AI service, no new database table.
 */
export async function getCoachContext(user: UserDTO): Promise<CoachContext> {
  const [dashboardData, latestLinkedInAnalysis, opportunities, analytics, latestPrep, preference, careerGoal] =
    await Promise.all([
      getDashboardData(user.id),
      getLatestLinkedInAnalysis(user.id),
      listOpportunitiesForUser(user.id),
      computeApplicationAnalytics(user.id),
      getLatestInterviewPrepForUser(user.id),
      getDiscoveryPreference(user.id),
      getCareerGoal(user.id),
    ]);

  const interviewHref = latestPrep
    ? `/opportunities/${latestPrep.interview.opportunity.id}`
    : "/opportunities";

  const nextStep = recommendNextStep({
    resumeCount: dashboardData.resumeCount,
    latestResumeScore: dashboardData.latestAnalysis?.overallScore ?? null,
    linkedInOptimized: latestLinkedInAnalysis !== null,
    jobsFound: opportunities.length > 0,
    applicationsStarted: analytics.totalApplications > 0,
    interviewReady: latestPrep !== null,
    interviewHref,
  });

  return {
    user,
    resume: {
      count: dashboardData.resumeCount,
      latestResumeId: dashboardData.latestResume?.id ?? null,
    },
    resumeAnalysis: {
      hasAnalysis: dashboardData.latestAnalysis !== null,
      latestScore: dashboardData.latestAnalysis?.overallScore ?? null,
    },
    linkedIn: {
      hasAnalysis: latestLinkedInAnalysis !== null,
    },
    applications: {
      total: analytics.totalApplications,
      totalInterviews: analytics.totalInterviews,
      totalOffers: analytics.totalOffers,
      responseRate: analytics.responseRate,
    },
    interview: {
      isReady: latestPrep !== null,
      href: interviewHref,
    },
    jobs: {
      savedCount: opportunities.length,
    },
    dashboard: {
      recentActivity: dashboardData.recentActivity,
    },
    // Derived from the `opportunities` list already fetched above — no
    // extra query.
    hired: {
      achieved: opportunities.some((opportunity) => opportunity.status === "JOINED"),
    },
    onboarding: {
      targetRole: careerGoal?.targetRole ?? null,
      targetTimeline: careerGoal?.targetTimeline ?? null,
      urgency: (preference?.availability as CoachContext["onboarding"]["urgency"]) ?? null,
      dreamCompanies: (preference?.preferredCompanies as string[]) ?? [],
      searchPriorities: (preference?.searchPriorities as CoachContext["onboarding"]["searchPriorities"]) ?? [],
      existingJobPortals: (preference?.existingJobPortals as string[]) ?? [],
      locationSummary: preference
        ? buildLocationSummary({
            countries: preference.countries as string[],
            states: preference.states as string[],
            cities: preference.cities as string[],
            remote: preference.remote,
            hybrid: preference.hybrid,
            onsite: preference.onsite,
            openToRelocation: preference.openToRelocation,
          })
        : null,
    },
    nextStep,
  };
}
