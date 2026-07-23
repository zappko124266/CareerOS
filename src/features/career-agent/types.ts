import type { AutomationExecution } from "@/features/automation/types";
import type { DiscoveryBriefing } from "@/features/discovery/briefing";
import type { listInterviewEventsForUser } from "@/features/interviews/queries";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";

import type { NextStepStage } from "../coach/recommend-next-step";

/** One row from `listInterviewEventsForUser` — every interview across
 * every opportunity this user has, regardless of whether it's scheduled
 * in the past or future. */
export type InterviewEvent = Awaited<ReturnType<typeof listInterviewEventsForUser>>[number];

/**
 * The Daily Mission Engine's output — exactly one highest-impact
 * recommendation. `title`/`why`/`href`/`actionLabel` are a direct
 * pass-through of the existing `NextStep` (`recommendNextStep`'s "first
 * matching rule wins" chain is the only place a stage is decided); this
 * only adds a deterministic effort estimate on top.
 */
export interface DailyMission {
  stage: NextStepStage;
  title: string;
  why: string;
  href: string;
  actionLabel: string;
  effort: string;
}

/** Sprint 3 (Career Inbox) — a small, additive set today. Adding a
 * future external event source (e.g. a Slack/email plugin) means adding
 * one more literal here plus one new builder function in `inbox.ts` —
 * the merge/sort logic in `buildCareerInboxEvents` never needs to
 * change. Sprint 5 (Automation Engine) realized that extension point once:
 * `"automation"`, fed by `features/automation/history.ts`'s
 * `toCareerEvents`. Sprint 16 (Gmail Intelligence) realizes it again:
 * `"gmail"`, fed by `features/gmail-intelligence/memory.ts`'s own
 * `toCareerEvents`. Sprint 21 (Recruiter Intelligence & Networking
 * Operating System) realizes it again: `"recruiter"`, fed by
 * `features/recruiters/timeline.ts`'s `toRecruiterCareerEvents`. */
export type CareerEventSource = "resume" | "opportunity" | "interview" | "automation" | "gmail" | "recruiter";

export interface CareerEvent {
  id: string;
  source: CareerEventSource;
  title: string;
  description: string;
  timestamp: Date;
  href: string;
}

/**
 * The Career Health Engine's output (`computeCareerHealthV2`), reframed
 * as a human-readable assessment rather than led by `overallScore`.
 * `strengths`/`blockers` reuse each factor's own already-human-written
 * `explanation` string — no new copy invented, just selected and
 * assembled. `overallScore` is kept for secondary display only.
 */
export interface CareerHealthSummary {
  headline: string;
  strengths: string[];
  blockers: string[];
  overallScore: number | null;
}

/**
 * The Career Agent's unified daily snapshot — everything Dashboard V4
 * needs beyond what's already on `CoachContext` (Welcome, Applications,
 * Career Roadmap, AI Coach preview all read `CoachContext` directly).
 */
export interface CareerAgentSnapshot {
  dailyMission: DailyMission;
  agentStatus: DiscoveryBriefing;
  /** Sprint 5 (Automation Engine) — real execution state only, sourced
   * from `features/automation/history.ts`'s `listAutomationExecutions`
   * (already fetched once by the Career Brain). */
  recentExecutions: AutomationExecution[];
  inboxEvents: CareerEvent[];
  recommendedOpportunities: PriorityQueueRow[];
  upcomingInterviews: InterviewEvent[];
  healthSummary: CareerHealthSummary;
  /** Sprint 9 (Application Engine) — a real read of the *last scheduled*
   * `application_engine_review` run's recorded decisions
   * (`recentExecutions`, already fetched), never a live recompute: this
   * snapshot is read on every dashboard view, and the Application
   * Engine's AI review step is a real AI Router call that must stay
   * confined to the bounded Automation task, not fire on every page
   * load. */
  applicationEngineSummary: { readyForManualReviewCount: number; lastRunAt: Date | null };
}
