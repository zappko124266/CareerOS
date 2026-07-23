import type { AutomationExecution, AutomationPriority, AutomationTaskId } from "@/features/automation/types";
import type { CareerEvent } from "@/features/career-agent/types";
import type { ConnectionSummary } from "@/features/connectors/manager";
import type { NextStep } from "@/features/coach/recommend-next-step";
import type { GmailIntelligenceSummary } from "@/features/gmail-intelligence/types";
import type { ApplicationEngineExecutionSummary, InterviewIntelligenceSummary } from "@/features/career-brain/types";
import type { EnrichedRecruiter } from "@/features/recruiters/orchestrator";

/**
 * Sprint 15 — the Autonomous Career Agent's unified status model (Step 5).
 * Replaces nothing that persists state (there is no "agent process"
 * running between requests — see `orchestrator.ts`'s own doc comment) —
 * this is a deterministic label computed fresh from real signals on every
 * read, the same way `NextStepStage` already labels the Coach's own
 * priority chain. Every value must be reachable only via a real condition
 * in `status.ts`; none is decorative.
 */
export type AgentStatus =
  | "IDLE"
  | "PLANNING"
  | "DISCOVERING_JOBS"
  | "REVIEWING_OPPORTUNITIES"
  | "WAITING_FOR_USER"
  | "NEEDS_RESUME_UPDATE"
  | "WAITING_FOR_CONNECTOR"
  | "PAUSED"
  | "COMPLETED";

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  IDLE: "Idle",
  PLANNING: "Planning",
  DISCOVERING_JOBS: "Discovering Jobs",
  REVIEWING_OPPORTUNITIES: "Reviewing Opportunities",
  WAITING_FOR_USER: "Waiting for You",
  NEEDS_RESUME_UPDATE: "Needs Resume Update",
  WAITING_FOR_CONNECTOR: "Waiting for Connector",
  PAUSED: "Paused",
  COMPLETED: "Completed for Today",
};

/**
 * Every action category the planner can produce. `CHECK_GMAIL`/
 * `CHECK_CALENDAR` exist here only so the type is forward-compatible with
 * a genuinely live "go check the inbox/calendar right now" action — no
 * code in this codebase does that (no push/poll consumer exists), so
 * `planner.ts` never emits either. `review_career_email` (Sprint 16) is
 * different in kind, not degree: it surfaces a specific, already-real,
 * already-classified `GmailCareerEvent` (Gmail Intelligence Engine) the
 * user hasn't acted on yet — "you have a new interview invitation," not
 * "go check your email." That distinction is what keeps it from being
 * the fabricated-reminder behavior Step 9 (Sprint 16) forbids.
 */
export type AgentActionCategory =
  | "discover_jobs"
  | "refresh_connector"
  | "review_applications"
  | "recommend_follow_up"
  | "recommend_interview_prep"
  | "update_resume"
  | "update_linkedin"
  | "review_career_email"
  | "resolve_scheduling_conflict"
  | "check_gmail"
  | "check_calendar";

/**
 * One prioritized recommendation. `automationTaskId` is set only when this
 * action maps to a real, registered `AutomationTaskDefinition`
 * (`features/automation/registry.ts`) — the orchestrator never invents an
 * automation task id, and the dashboard can use its presence to decide
 * whether "this runs in the background" is a true statement for this
 * specific item.
 */
export interface AgentAction {
  id: string;
  category: AgentActionCategory;
  title: string;
  why: string;
  priority: AutomationPriority;
  href: string;
  automationTaskId: AutomationTaskId | null;
}

export interface AgentActionPlan {
  status: AgentStatus;
  statusDetail: string;
  actions: AgentAction[];
  generatedAt: Date;
}

/** A *suggested* time-of-day slot for an already-prioritized action — see
 * `scheduler.ts`'s own doc comment for why these are never presented as a
 * guarantee. */
export interface DailyScheduleSlot {
  time: string;
  action: AgentAction;
}

export type AutonomousAgentEventType =
  | "JOB_DISCOVERY_COMPLETED"
  | "CONNECTOR_EXPIRED"
  | "RESUME_UPDATED"
  | "INTERVIEW_SCHEDULED"
  | "APPLICATION_RECOMMENDED"
  | "APPLICATION_SUBMITTED"
  | "AUTOMATION_FAILED";

export interface AutonomousAgentEvent {
  id: string;
  type: AutonomousAgentEventType;
  title: string;
  timestamp: Date;
  href: string;
}

export interface TodaysProgress {
  completed: number;
  /** Only counts tasks that were actually due today, per the same
   * `listDue` calls the orchestrator already made — never a fabricated
   * denominator. */
  total: number;
}

/** The one object `planner.ts`/`status.ts` need — assembled by
 * `orchestrator.ts` from Career Brain, the Career Agent snapshot, the
 * Connection Manager, and the Automation Engine's own registry. Nothing
 * in `planner.ts`/`status.ts` reaches into Prisma, the AI Router, or any
 * feature module directly — see those files' own doc comments. */
export interface AgentPlanningInput {
  nextStep: NextStep;
  connectionSummaries: ConnectionSummary[];
  automationExecutions: AutomationExecution[];
  careerMemory: CareerEvent[];
  applicationEngineSummary: { readyForManualReviewCount: number; lastRunAt: Date | null };
  /** Sprint 18 — the Autonomous Application Engine's real, persisted
   * execution state (`brain.applicationEngineExecutionSummary`) —
   * distinct from `applicationEngineSummary` above (which reflects
   * Sprint 9's in-memory AI-review queue, not the newer persisted
   * pipeline). The planner folds `waitingApproval` into the existing
   * `review_applications` action rather than adding a new category. */
  applicationExecutionSummary: ApplicationEngineExecutionSummary;
  hasUpcomingInterview: boolean;
  /** Sprint 16 — Step 7's integration point. Already-computed by
   * `getCareerBrain` (`brain.gmailIntelligence`); the planner only reads
   * its per-category arrays, never queries `GmailCareerEvent` itself. */
  gmailIntelligence: GmailIntelligenceSummary;
  /** Whether each registered `AutomationTaskId` currently has at least
   * one due subject for this user — computed by calling that task's own
   * real `listDue` (see `orchestrator.ts`), never re-derived here. */
  dueTasks: Partial<Record<AutomationTaskId, boolean>>;
  /** `false` only when the *specific* automation task this reflects
   * (`job_discovery_run`) is genuinely blocked by a real entitlement/plan
   * limit — see `orchestrator.ts`. */
  jobDiscoveryEligible: boolean;
  /** Sprint 17 — Step 13's real interview-lifecycle signals, already
   * derived once by Career Brain (`brain.interviewIntelligence`) from
   * calendar-verified `Interview` rows. The planner/status derivation
   * below only read it, never recompute `deriveInterviewLifecycleLabel`
   * themselves. */
  interviewIntelligence: InterviewIntelligenceSummary;
  /** Sprint 21 (Recruiter Intelligence & Networking Operating System),
   * Module 12 — already computed by Career Brain
   * (`brain.pendingFollowUps`, `features/recruiters/orchestrator.ts`)
   * from real `RecruiterInteraction` rows; the planner only reads it,
   * never recomputes relationship health itself. */
  pendingRecruiterFollowUps: EnrichedRecruiter[];
}

export interface AutonomousAgentReport {
  plan: AgentActionPlan;
  events: AutonomousAgentEvent[];
  schedule: DailyScheduleSlot[];
  todaysProgress: TodaysProgress;
}
