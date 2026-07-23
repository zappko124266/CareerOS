import type { AgentActionCategory } from "./types";
import type { AutomationPriority } from "@/features/automation/types";

/**
 * Planning Policies — deterministic thresholds and ordering rules the
 * planner/status derivation use. **Not** `features/automation/policies.ts`
 * (that file is the Retry Engine — attempt backoff for one task
 * execution, a completely different concern). Naming this file
 * `policies.ts` matches the mission's requested module shape; nothing
 * here overlaps with the Automation Engine's retry policy, and nothing
 * here is imported by it.
 */

/** How many due subjects to scan per registered automation task when
 * checking "is this specific user due right now" (`orchestrator.ts`).
 * Reuses each task's own real `listDue` — this only bounds how much of
 * that already-real result set gets pulled back, not a new eligibility
 * rule. Kept generous since these are simple indexed queries, not AI
 * Router calls. */
export const DUE_TASK_SCAN_LIMIT = 300;

/** Stable sort weight — higher first. Reuses the exact `AutomationPriority`
 * union every automation task already declares (`"high" | "normal" |
 * "low"`); this is not a parallel priority system. */
export const AGENT_ACTION_PRIORITY_WEIGHT: Record<AutomationPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

/** Tie-break order when two actions share a priority — earlier wins.
 * Connector/resume issues sort first because they block or degrade
 * everything downstream (a stale resume makes every job-match score
 * worse; an expired connector blocks its own capabilities entirely). */
export const AGENT_ACTION_CATEGORY_ORDER: AgentActionCategory[] = [
  "resolve_scheduling_conflict",
  "refresh_connector",
  "recommend_interview_prep",
  "update_resume",
  "review_career_email",
  "review_applications",
  "discover_jobs",
  "recommend_follow_up",
  "update_linkedin",
  "check_gmail",
  "check_calendar",
];
