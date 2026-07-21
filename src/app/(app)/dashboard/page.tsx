import type { Metadata } from "next";

import { CareerHealthCard } from "@/components/dashboard/career-health-card";
import { CareerSnapshotCard } from "@/components/dashboard/career-snapshot-card";
import { CopilotPanel } from "@/components/dashboard/copilot-panel";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { buildBriefing } from "@/features/dashboard/briefing";
import { getDashboardData } from "@/features/dashboard/queries";
import { computeCareerHealthV2 } from "@/features/career/health";
import { getCoachContext } from "@/features/coach/context";
import { getCareerRoadmap } from "@/features/coach/roadmap";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Home" };

/**
 * Simplified Home dashboard — Welcome back + next recommended action
 * (CopilotPanel), Career Snapshot (Sprint 1.5: Current Goal/Focus/
 * Location/Progress, reusing the Coach Context/Roadmap Engines wholesale
 * — no new query), Recent activity, and Career progress. The technical
 * widgets this used to show (Profile Optimization, Resume/LinkedIn
 * scores, Job Match, Salary, Skills, Applications summary, Interview
 * readiness, AI Recommendations, Onboarding, Quick Actions) are still
 * fully built and reachable from AI Coach / Resume / Jobs / Applications
 * — this page just stops surfacing all of them at once.
 */
export default async function DashboardPage() {
  const user = await verifySession();
  const [data, health, coachContext] = await Promise.all([
    getDashboardData(user.id),
    computeCareerHealthV2(user.id).catch(() => null),
    getCoachContext(user),
  ]);

  const briefing = buildBriefing(
    data.resumeCount,
    data.latestAnalysis,
    coachContext.onboarding.targetRole,
    coachContext.onboarding.urgency,
  );
  const roadmap = getCareerRoadmap(coachContext);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <CopilotPanel name={user.fullName ?? ""} briefing={briefing} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CareerSnapshotCard onboarding={coachContext.onboarding} roadmap={roadmap} />
        <RecentActivityFeed items={data.recentActivity} />
      </div>

      <CareerHealthCard health={health} />
    </div>
  );
}
