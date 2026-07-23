import type { CareerBrain } from "@/features/career-brain/types";
import type { CoachContext } from "@/features/coach/types";
import { buildDiscoveryBriefing } from "@/features/discovery/briefing";
import { buildApplicationsPriorityQueue } from "@/features/opportunities/priority-queue";

import { buildDailyMission } from "./daily-mission";
import { buildCareerHealthSummary } from "./health-summary";
import type { CareerAgentSnapshot } from "./types";

const RECOMMENDED_OPPORTUNITY_LIMIT = 3;
const UPCOMING_INTERVIEW_LIMIT = 5;

/**
 * The Career Agent — Sprint 4: now a pure, synchronous derivation over
 * the Career Brain (`features/career-brain/brain.ts`), which runs every
 * query this function used to run itself (career health, latest
 * discovery run, interview events, the Priority Queue's underlying
 * match computation). No DB/AI calls happen here anymore — Mission
 * generation, Career Inbox, Recommended Opportunities, and the Health
 * Summary are all built from data the Brain already computed once.
 *
 * Extension point for future background jobs: this function is a pure
 * `(brain, context) -> snapshot` computation with no hidden state — a
 * future cron could call `getCareerBrain` + this on a schedule and
 * persist the result (e.g. into a `CareerAgentSnapshot` table) without
 * changing any call site, the same way `generateAndPersistCareerHealth`
 * already wraps `computeCareerHealthV2`. No new Prisma model is added
 * now since none was asked for.
 */
export function getCareerAgentSnapshot(brain: CareerBrain, context: CoachContext): CareerAgentSnapshot {
  const { raw } = brain;

  const tiers = buildApplicationsPriorityQueue(raw.priorityQueueRows);
  const recommendedOpportunities =
    tiers.find((tier) => tier.key === "strong_match" || tier.key === "good_match")?.rows.slice(
      0,
      RECOMMENDED_OPPORTUNITY_LIMIT,
    ) ?? [];

  const now = new Date();
  const upcomingInterviews = raw.interviewEvents
    .filter((interview) => interview.scheduledAt !== null && interview.scheduledAt >= now)
    .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime())
    .slice(0, UPCOMING_INTERVIEW_LIMIT);

  // Sprint 9 — a real read of the last scheduled `application_engine_review`
  // run's per-opportunity decisions (already fetched as part of
  // `raw.automationExecutions`), never a live recompute: the Application
  // Engine's AI review is a real AI Router call and must stay confined to
  // the bounded Automation task, not fire on every dashboard view.
  const applicationEngineExecutions = raw.automationExecutions.filter(
    (execution) => execution.taskId === "application_engine_review",
  );
  const applicationEngineSummary = {
    readyForManualReviewCount: applicationEngineExecutions.filter((execution) => execution.status === "completed")
      .length,
    lastRunAt: applicationEngineExecutions[0]?.timestamp ?? null,
  };

  return {
    dailyMission: buildDailyMission(context.nextStep),
    // Lightweight variant: the full Discovery page additionally computes
    // dream-employer matches and an eligibility note via 2 more queries
    // (`listDiscoveredCompanies` x2) — not worth the extra cost for a
    // compact dashboard status card, so this passes `[]`/`null` and
    // links out to `/opportunities/discovery` for that fuller detail.
    agentStatus: buildDiscoveryBriefing(raw.latestDiscoveryRun, [], null),
    recentExecutions: raw.automationExecutions,
    inboxEvents: brain.careerMemory,
    recommendedOpportunities,
    upcomingInterviews,
    healthSummary: buildCareerHealthSummary(raw.health),
    applicationEngineSummary,
  };
}
