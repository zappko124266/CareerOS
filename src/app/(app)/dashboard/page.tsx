import type { Metadata } from "next";

import { AiCoachPreviewCard } from "@/components/dashboard/ai-coach-preview-card";
import { ApplicationsSummaryCard } from "@/components/dashboard/applications-summary-card";
import { AutonomousAgentPlanCard } from "@/components/dashboard/autonomous-agent-plan-card";
import { CareerAgentStatusCard } from "@/components/dashboard/career-agent-status-card";
import { CareerHealthCard } from "@/components/dashboard/career-health-card";
import { CareerInboxCard } from "@/components/dashboard/career-inbox-card";
import { CareerInboxIntelligenceCard } from "@/components/dashboard/career-inbox-intelligence-card";
import { CopilotPanel } from "@/components/dashboard/copilot-panel";
import { DailyMissionCard } from "@/components/dashboard/daily-mission-card";
import { FloatingQuickActions } from "@/components/dashboard/floating-quick-actions";
import { InterviewCalendarIntelligenceCard } from "@/components/dashboard/interview-calendar-intelligence-card";
import { InterviewCenterCard } from "@/components/dashboard/interview-center-card";
import { OpportunityCenterCard } from "@/components/dashboard/opportunity-center-card";
import { RecruiterNetworkCard } from "@/components/dashboard/recruiter-network-card";
import { ResumeIntelligenceCard } from "@/components/dashboard/resume-intelligence-card";
import { CareerRoadmapCard } from "@/components/coach/career-roadmap-card";
import { runAutonomousAgentCycle } from "@/features/autonomous-agent/orchestrator";
import { buildBriefing } from "@/features/dashboard/briefing";
import { getCareerAgentSnapshot } from "@/features/career-agent/agent";
import { getCareerBrain } from "@/features/career-brain/brain";
import { buildCoachContext } from "@/features/coach/context";
import { getCareerRoadmap } from "@/features/coach/roadmap";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Home" };

/**
 * Dashboard V5 / Mission Control (Sprint 10) — still built entirely on
 * the Career Brain (one query root, `getCareerBrain`); `buildCoachContext`
 * and `getCareerAgentSnapshot` remain pure, synchronous derivations. The
 * two genuinely new surfaces (Opportunity Center's extra tabs, Resume
 * Intelligence) render fields the Brain already computed
 * (`priorityQueueRows`, `resumeIntelligence`) but never displayed —
 * no new queries, no new business logic. Entrance animation uses
 * `tw-animate-css`'s `animate-in` utilities (the same convention every
 * shadcn primitive already uses) — CSS-only, automatically capped by
 * this app's global `prefers-reduced-motion` safety net
 * (`app/globals.css`), no JS scroll listeners.
 *
 * Sprint 15 adds `runAutonomousAgentCycle` (`features/autonomous-agent/`)
 * to this same pattern: one more pure/derived step over the Brain and
 * Career Agent snapshot already computed below, plus a handful of
 * `listDue` calls against the existing Automation Engine registry — no
 * new page-level query.
 *
 * Sprint 16 adds `brain.gmailIntelligence` (Gmail Intelligence Engine) —
 * already computed inside `getCareerBrain` itself (one query,
 * `listRecentGmailCareerEvents`), so `CareerInboxIntelligenceCard` below
 * needs no new fetch either. `listConnectionSummaries` (used by both
 * Sprint 15's agent and Sprint 16's Gmail summary) moved into
 * `getCareerBrain`'s own query batch this sprint so neither has to fetch
 * it separately — see `career-brain/types.ts`'s `raw.connectionSummaries`.
 *
 * Sprint 17 adds `brain.interviewIntelligence` (Calendar Intelligence &
 * Interview Management Engine) — a pure derivation over
 * `raw.interviewEvents` (widened to carry `meetingStatus`/`hasConflict`/
 * etc.) and `raw.connectionSummaries`, computed once inside
 * `getCareerBrain`. `InterviewCalendarIntelligenceCard` below performs
 * zero calendar API calls itself (Hard Lock 7) — it only reads what the
 * `calendar_sync` automation task already persisted.
 *
 * Sprint 18 adds `brain.applicationEngineExecutionSummary` (Autonomous
 * Application Engine) — extends the existing `ApplicationsSummaryCard`
 * (no new dashboard widget) with real, persisted `ApplicationExecution`
 * state and a Human Approval surface, again a pure Career Brain
 * derivation with no new page-level query.
 *
 * Sprint 19 adds `brain.opportunitySyncSummary` (Universal Opportunity
 * Sync Engine) — extends the existing `CareerAgentStatusCard` (no new
 * widget) with real Change Detector/closure-pass counts, again a pure
 * Career Brain derivation over data `run-discovery.ts` already writes.
 *
 * Sprint 21 (Recruiter Intelligence & Networking Operating System) adds
 * `RecruiterNetworkCard`, reading five new top-level Career Brain fields
 * (`recruiters`/`relationshipSummary`/`networkHealth`/`pendingFollowUps`/
 * `referrals`) — all pure derivations (`features/recruiters/
 * orchestrator.ts`) over the one additional batched query
 * (`listRecruitersForUser`/`listReferralsForUser`) Career Brain now runs
 * alongside its existing `Promise.all`. A new widget, not an extension of
 * an existing one, since no prior card showed recruiter/referral data.
 *
 * Sprint 20 (Interview Intelligence & Interview Operating System) extends
 * `brain.interviewIntelligence` (no new Career Brain query — Module 13)
 * with `waitingTooLong`/`offers`/`needsPreparation`, all pure derivations
 * over `raw.interviewEvents` (widened with `stageHistory`/`createdAt`)
 * via the new shared `buildInterviewStageProgress`. Renders on the
 * existing `InterviewCalendarIntelligenceCard` (no new widget), plus
 * `brain.gmailIntelligence.pendingAssessments` (Sprint 16, unchanged) for
 * the Assessments row. The richer per-interview surfaces (Stage Tracker,
 * Interview Planner, Interview Brief, Offer Probability, Feedback
 * Intelligence) live on the opportunity workspace page instead, since
 * they need per-opportunity data (Company Intelligence, resume versions,
 * Experience Gap Assessment) this dashboard doesn't fetch.
 */
export default async function DashboardPage() {
  const user = await verifySession();
  const brain = await getCareerBrain(user);
  const coachContext = buildCoachContext(brain);
  const snapshot = getCareerAgentSnapshot(brain, coachContext);
  const roadmap = getCareerRoadmap(coachContext);
  const agentReport = await runAutonomousAgentCycle(brain, snapshot);

  const briefing = buildBriefing(
    coachContext.resume.count,
    coachContext.resumeAnalysis.latest,
    coachContext.onboarding.targetRole,
    coachContext.onboarding.urgency,
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CopilotPanel name={user.fullName ?? ""} briefing={briefing} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 delay-75 grid grid-cols-1 gap-4 duration-500 fill-mode-both lg:grid-cols-2">
        <DailyMissionCard mission={snapshot.dailyMission} />
        <AutonomousAgentPlanCard report={agentReport} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 delay-100 grid grid-cols-1 gap-4 duration-500 fill-mode-both lg:grid-cols-2">
        <CareerAgentStatusCard
          status={snapshot.agentStatus}
          recentExecutions={snapshot.recentExecutions}
          syncSummary={brain.opportunitySyncSummary}
        />
        <CareerInboxCard events={snapshot.inboxEvents} />
        <ApplicationsSummaryCard
          analytics={{
            totalApplications: coachContext.applications.total,
            totalInterviews: coachContext.applications.totalInterviews,
            totalOffers: coachContext.applications.totalOffers,
            responseRate: coachContext.applications.responseRate,
          }}
          engineSummary={brain.applicationEngineExecutionSummary}
        />
        <CareerInboxIntelligenceCard summary={brain.gmailIntelligence} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 delay-150 grid grid-cols-1 gap-4 duration-500 fill-mode-both lg:grid-cols-2">
        <OpportunityCenterCard brain={brain} recommended={snapshot.recommendedOpportunities} />
        <ResumeIntelligenceCard resumeIntelligence={brain.resumeIntelligence} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InterviewCenterCard interviews={snapshot.upcomingInterviews} health={brain.raw.health} />
        <InterviewCalendarIntelligenceCard
          intelligence={brain.interviewIntelligence}
          pendingAssessments={brain.gmailIntelligence.pendingAssessments}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecruiterNetworkCard
          recruiters={brain.recruiters}
          networkHealth={brain.networkHealth}
          pendingFollowUps={brain.pendingFollowUps}
          referrals={brain.referrals}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CareerRoadmapCard roadmap={roadmap} />
        <AiCoachPreviewCard context={coachContext} />
        <CareerHealthCard summary={snapshot.healthSummary} />
      </div>

      <FloatingQuickActions />
    </div>
  );
}
