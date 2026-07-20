import type { Metadata } from "next";

import { AiRecommendationsCard } from "@/components/dashboard/ai-recommendations-card";
import { ApplicationsSummaryCard } from "@/components/dashboard/applications-summary-card";
import { CareerHealthCard } from "@/components/dashboard/career-health-card";
import { CopilotPanel } from "@/components/dashboard/copilot-panel";
import { InterviewReadinessCard } from "@/components/dashboard/interview-readiness-card";
import { JobMatchCard } from "@/components/dashboard/job-match-card";
import { LinkedInScoreCard } from "@/components/dashboard/linkedin-score-card";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { ProfileOptimizationCard } from "@/components/dashboard/profile-optimization-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ResumeScoreCard } from "@/components/dashboard/resume-score-card";
import { SalaryInsightsCard } from "@/components/dashboard/salary-insights-card";
import { SkillsProgressCard } from "@/components/dashboard/skills-progress-card";
import { computeApplicationAnalytics } from "@/features/analytics/service";
import { buildBriefing } from "@/features/dashboard/briefing";
import { getDashboardData, getSalaryPrefill } from "@/features/dashboard/queries";
import { computeCareerHealthV2 } from "@/features/career/health";
import { getLatestInterviewPrepForUser } from "@/features/interviews/queries";
import { getLatestLinkedInAnalysis, getLinkedInProfile } from "@/features/linkedin-profile/queries";
import { getOnboardingStatus } from "@/features/onboarding/service";
import { generateProfileInsights } from "@/features/profile-optimization/insights";
import { getProfileOptimizationSummary } from "@/features/profile-optimization/service";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await verifySession();
  const [
    data,
    analytics,
    health,
    latestPrep,
    linkedInProfile,
    latestLinkedInAnalysis,
    profileOptimizationSummary,
    profileInsights,
    onboardingStatus,
  ] = await Promise.all([
    getDashboardData(user.id),
    computeApplicationAnalytics(user.id),
    computeCareerHealthV2(user.id).catch(() => null),
    getLatestInterviewPrepForUser(user.id),
    getLinkedInProfile(user.id),
    getLatestLinkedInAnalysis(user.id),
    getProfileOptimizationSummary(user.id),
    generateProfileInsights(user.id),
    getOnboardingStatus(user.id),
  ]);

  const briefing = buildBriefing(data.resumeCount, data.latestAnalysis);
  const salaryPrefill = getSalaryPrefill(data.latestResume);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <OnboardingCard status={onboardingStatus} />
      <CopilotPanel name={user.fullName ?? ""} briefing={briefing} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileOptimizationCard summary={profileOptimizationSummary} insights={profileInsights} />
        <CareerHealthCard health={health} />
        <ResumeScoreCard
          resumeId={data.latestResume?.id ?? null}
          latestAnalysis={data.latestAnalysis}
          historyCount={data.analysisHistory.length}
        />
        <LinkedInScoreCard hasProfile={Boolean(linkedInProfile)} latestAnalysis={latestLinkedInAnalysis} />
        <JobMatchCard />
        <SalaryInsightsCard prefill={salaryPrefill} />
        <SkillsProgressCard />
        <ApplicationsSummaryCard analytics={analytics} />
        <InterviewReadinessCard
          latest={
            latestPrep
              ? {
                  confidenceScore: latestPrep.confidenceScore,
                  opportunityId: latestPrep.interview.opportunity.id,
                  roleTitle: latestPrep.interview.opportunity.title,
                  companyName: latestPrep.interview.opportunity.companyName,
                }
              : null
          }
        />
        <AiRecommendationsCard hasResume={data.resumeCount > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentActivityFeed items={data.recentActivity} />
        <QuickActions />
      </div>
    </div>
  );
}
