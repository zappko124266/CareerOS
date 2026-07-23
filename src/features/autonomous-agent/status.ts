import type { AgentAction, AgentPlanningInput, AgentStatus } from "./types";

function ranToday(input: AgentPlanningInput, now: Date): boolean {
  const lastDiscoveryRun = input.automationExecutions.find(
    (execution) => execution.taskId === "job_discovery_run" && execution.status === "completed",
  );
  if (!lastDiscoveryRun) return false;
  return lastDiscoveryRun.timestamp.toDateString() === now.toDateString();
}

/**
 * The Autonomous Career Agent's status derivation — Step 5. Same
 * "first matching rule wins" idiom `recommendNextStep`
 * (`features/coach/recommend-next-step.ts`) already established for this
 * codebase, applied to a wider signal set. Every branch below cites the
 * exact real field it read; there is no default/decorative branch beyond
 * the final `IDLE` fallback, which itself only fires when every prior
 * condition is honestly false.
 *
 * This does **not** observe a live, currently-running process — Vercel
 * Functions are stateless between invocations (the same constraint
 * `features/automation/policies.ts` documents), so nothing in this
 * codebase can know "a task is executing right now" from a page render
 * that happens in a separate request. `DISCOVERING_JOBS`/
 * `REVIEWING_OPPORTUNITIES` mean "this is what the agent's plan says
 * should run next," not "this is happening as you read this" — the
 * dashboard copy built on top of this must preserve that distinction
 * rather than implying a live process.
 */
export function deriveAgentStatus(
  input: AgentPlanningInput,
  actions: AgentAction[],
  now: Date,
): { status: AgentStatus; detail: string } {
  // Sprint 17, Step 13 — a real, calendar-verified interview today (or a
  // real, persisted scheduling conflict against one) is checked first:
  // more time-critical than anything else in this chain, since "today"
  // cannot wait for a later status to surface it.
  const todaysConflict = input.interviewIntelligence.conflicts.find(
    (event) => event.scheduledAt !== null && event.scheduledAt.toDateString() === now.toDateString(),
  );
  if (todaysConflict) {
    return {
      status: "WAITING_FOR_USER",
      detail: todaysConflict.conflictNote ?? `Your interview with ${todaysConflict.opportunity.companyName} today has a scheduling conflict.`,
    };
  }

  if (input.interviewIntelligence.todaysInterviews.length > 0) {
    const interview = input.interviewIntelligence.todaysInterviews[0];
    return { status: "WAITING_FOR_USER", detail: `Interview today with ${interview.opportunity.companyName}.` };
  }

  const brokenConnection = input.connectionSummaries.find(
    (summary) => summary.status === "EXPIRED" || summary.status === "ERROR",
  );
  if (brokenConnection) {
    return {
      status: "WAITING_FOR_CONNECTOR",
      detail: `Your ${brokenConnection.provider.charAt(0)}${brokenConnection.provider.slice(1).toLowerCase()} connection needs to be reconnected.`,
    };
  }

  if (input.nextStep.stage === "resume_missing" || input.nextStep.stage === "resume_poor") {
    return { status: "NEEDS_RESUME_UPDATE", detail: input.nextStep.why };
  }

  if (!input.jobDiscoveryEligible) {
    return {
      status: "PAUSED",
      detail: "Automated job discovery is paused — you've reached your plan's limit for this period.",
    };
  }

  // Sprint 18 — a fully-prepared, real `ApplicationExecution` waiting on
  // approval is checked before the older AI-review backlog signal below,
  // same "most concrete state wins" ordering `planner.ts` uses.
  if (input.applicationExecutionSummary.waitingApproval.length > 0) {
    const count = input.applicationExecutionSummary.waitingApproval.length;
    return {
      status: "WAITING_FOR_USER",
      detail: `${count} application${count === 1 ? "" : "s"} fully prepared and waiting on your approval.`,
    };
  }

  if (input.applicationEngineSummary.readyForManualReviewCount > 0) {
    return {
      status: "WAITING_FOR_USER",
      detail: `${input.applicationEngineSummary.readyForManualReviewCount} application${input.applicationEngineSummary.readyForManualReviewCount === 1 ? "" : "s"} reviewed and waiting on your decision.`,
    };
  }

  // Sprint 16 — a new offer or interview invitation found in Gmail is a
  // real, time-sensitive item only the user can act on, same tier as the
  // application-review backlog above.
  if (input.gmailIntelligence.recentOffers.length > 0) {
    return { status: "WAITING_FOR_USER", detail: "A new offer email needs your attention." };
  }
  if (input.gmailIntelligence.interviewInvitations.length > 0) {
    return { status: "WAITING_FOR_USER", detail: "A new interview invitation needs your attention." };
  }

  if (input.hasUpcomingInterview && input.nextStep.stage === "interview_missing") {
    return { status: "WAITING_FOR_USER", detail: input.nextStep.why };
  }

  if (input.dueTasks.application_engine_review) {
    return {
      status: "REVIEWING_OPPORTUNITIES",
      detail: "Saved opportunities are due for an AI review pass.",
    };
  }

  if (input.dueTasks.job_discovery_run) {
    return { status: "DISCOVERING_JOBS", detail: "A fresh job discovery run is due." };
  }

  if (actions.length > 0) {
    return { status: "PLANNING", detail: `${actions.length} recommended action${actions.length === 1 ? "" : "s"} on the plan.` };
  }

  if (ranToday(input, now)) {
    return { status: "COMPLETED", detail: "Today's scheduled discovery run already completed." };
  }

  return { status: "IDLE", detail: "Nothing needs attention right now." };
}
