import { STATUS_LABEL } from "@/features/opportunities/types";

import type { AgentPlanningInput, AutonomousAgentEvent } from "./types";

const RECENT_EVENT_LIMIT = 10;

/**
 * The Autonomous Agent's internal event model — Step 6. Deliberately not
 * a new table: every event here is a classification of a row that
 * already exists, either historical (from Execution History /
 * `AuditLog`-backed `automationExecutions`, or from the Career Brain's
 * own `careerMemory`) or a live state read (`CONNECTOR_EXPIRED`, from
 * `AccountConnection` via the Connection Manager). Those two kinds are
 * not the same thing — a `CONNECTOR_EXPIRED` "event" has no single
 * origin timestamp the way a completed discovery run does, so its
 * `timestamp` is `now` (when it was *observed*, not when it *happened*,
 * which this codebase has no record of) rather than a fabricated past
 * time.
 */
export function deriveAutonomousAgentEvents(input: AgentPlanningInput, now: Date): AutonomousAgentEvent[] {
  const events: AutonomousAgentEvent[] = [];

  for (const execution of input.automationExecutions) {
    if (execution.status === "failed") {
      events.push({
        id: `automation-failed-${execution.id}`,
        type: "AUTOMATION_FAILED",
        title: execution.detail ?? "A background task failed.",
        timestamp: execution.timestamp,
        href: "/dashboard",
      });
      continue;
    }

    if (execution.status !== "completed") continue;

    if (execution.taskId === "job_discovery_run") {
      events.push({
        id: `discovery-completed-${execution.id}`,
        type: "JOB_DISCOVERY_COMPLETED",
        title: execution.detail ?? "Job discovery run completed.",
        timestamp: execution.timestamp,
        href: "/opportunities/discovery",
      });
    } else if (execution.taskId === "application_engine_review" || execution.taskId === "follow_up_recommendation") {
      events.push({
        id: `application-recommended-${execution.id}`,
        type: "APPLICATION_RECOMMENDED",
        title: execution.detail ?? "New application recommendation available.",
        timestamp: execution.timestamp,
        href: "/applications",
      });
    }
  }

  for (const memory of input.careerMemory) {
    if (memory.source === "resume") {
      events.push({
        id: `resume-updated-${memory.id}`,
        type: "RESUME_UPDATED",
        title: memory.title,
        timestamp: memory.timestamp,
        href: memory.href,
      });
    } else if (memory.source === "interview") {
      events.push({
        id: `interview-scheduled-${memory.id}`,
        type: "INTERVIEW_SCHEDULED",
        title: memory.title,
        timestamp: memory.timestamp,
        href: memory.href,
      });
    } else if (memory.source === "opportunity" && memory.title.startsWith(`${STATUS_LABEL.APPLIED} —`)) {
      events.push({
        id: `application-submitted-${memory.id}`,
        type: "APPLICATION_SUBMITTED",
        title: memory.title,
        timestamp: memory.timestamp,
        href: memory.href,
      });
    }
  }

  for (const summary of input.connectionSummaries) {
    if (summary.status !== "EXPIRED" && summary.status !== "ERROR") continue;
    events.push({
      id: `connector-expired-${summary.provider}`,
      type: "CONNECTOR_EXPIRED",
      title: `${summary.provider.charAt(0)}${summary.provider.slice(1).toLowerCase()} connection needs attention.`,
      timestamp: now,
      href: "/opportunities/connections",
    });
  }

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, RECENT_EVENT_LIMIT);
}
