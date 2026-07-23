import { toCareerEvents as toAutomationCareerEvents } from "@/features/automation/history";
import type { AutomationExecution } from "@/features/automation/types";
import type { ActivityItem } from "@/features/dashboard/types";
import { INTERVIEW_STAGE_LABEL } from "@/features/interviews/types";
import type { InterviewStage } from "@/features/interviews/types";
import { STATUS_LABEL } from "@/features/opportunities/types";
import type { StatusHistory } from "@/features/opportunities/types";
import type { Opportunity } from "@/generated/prisma/client";

import type { CareerEvent, InterviewEvent } from "./types";

/**
 * The Career Inbox — Sprint 3, extended in Sprint 5. A unified timeline
 * merged from four already-fetched sources, no new query beyond what the
 * caller passes in:
 *  - resume events, reused as-is from `CoachContext.dashboard.recentActivity`
 *    (`features/dashboard/queries.ts`'s `buildRecentActivity`).
 *  - opportunity status-change events, derived from each saved
 *    Opportunity's own `statusHistory` JSON (already written by every
 *    status change — see `STATUS_ORDER`/`STATUS_LABEL`). This is also how
 *    "Offer received" shows up: `OFFER` is already a status in that
 *    order, so no separate Offer-table query is needed.
 *  - interview events, from `listInterviewEventsForUser` — every
 *    interview with a `scheduledAt` becomes one event.
 *  - automation events (Sprint 5) — real background-job execution
 *    history from `features/automation/history.ts`, the first
 *    realization of the extension point below.
 *
 * Extension point: a future external event source (e.g. a Slack/email
 * plugin) only needs one more literal on `CareerEventSource` and one new
 * builder function returning `CareerEvent[]`, concatenated into the same
 * merge below — this function's merge/sort logic never needs to change.
 */
const DEFAULT_LIMIT = 15;

/** Sprint 17 — labels for `Interview.meetingStatusHistory` entries
 * (`features/interviews/intelligence/tracking.ts`'s `transitionMeetingStatus`
 * is the only writer). `SCHEDULED` is deliberately absent — the base
 * "Interview — ..." event below already represents the initial
 * scheduling; only real *changes* (reschedule/cancel/complete) become a
 * second timeline entry. */
const MEETING_STATUS_TRANSITION_LABEL: Record<string, string> = {
  RESCHEDULED: "Interview Rescheduled",
  CANCELLED: "Interview Cancelled",
  COMPLETED: "Interview Completed",
};

/** Sprint 20 (Interview Intelligence & Interview Operating System),
 * Module 1 — "Uses existing Career Memory. Never build another
 * timeline." Every real `stageHistory` transition
 * (`transitionInterviewStage`, `features/interviews/service.ts`) becomes
 * its own entry here, the same treatment `meetingStatusHistory` already
 * gets below. `APPLIED` is skipped — every interview starts there, so
 * it would just repeat the base "Interview — ..." event this function
 * already emits from `scheduledAt`. */
const SKIPPED_STAGE_TRANSITIONS = new Set<string>(["APPLIED"]);

export function buildCareerInboxEvents(input: {
  recentActivity: ActivityItem[];
  opportunities: Opportunity[];
  interviewEvents: InterviewEvent[];
  automationExecutions: AutomationExecution[];
  /** Sprint 16 (Gmail Intelligence) — already reshaped into `CareerEvent[]`
   * by `gmail-intelligence/memory.ts`'s own `toCareerEvents` before
   * reaching here, same as `automationExecutions` is reshaped by
   * `toAutomationCareerEvents` below rather than this function knowing
   * anything about `GmailCareerEvent` rows directly. Optional so every
   * existing caller that hasn't been updated still compiles and behaves
   * exactly as before. */
  gmailEvents?: CareerEvent[];
  /** Sprint 21 (Recruiter Intelligence & Networking Operating System) —
   * already reshaped into `CareerEvent[]` by `features/recruiters/
   * timeline.ts`'s `toRecruiterCareerEvents` before reaching here, same
   * treatment as `gmailEvents` above. */
  recruiterEvents?: CareerEvent[];
  /** Sprint 13 (Career Identity) — the Career Timeline tab requests a
   * much higher limit than the dashboard's Career Inbox widget needs;
   * defaults to 15 so every existing caller's behavior is unchanged. */
  limit?: number;
}): CareerEvent[] {
  const resumeEvents: CareerEvent[] = input.recentActivity.map((item) => ({
    id: item.id,
    source: "resume",
    title: item.title,
    description: item.description,
    timestamp: item.timestamp,
    href: item.href ?? "/resume",
  }));

  const opportunityEvents: CareerEvent[] = input.opportunities.flatMap((opportunity) => {
    const history = (opportunity.statusHistory as unknown as StatusHistory) ?? [];
    return history.map((entry) => ({
      id: `opportunity-${opportunity.id}-${entry.status}-${entry.changedAt}`,
      source: "opportunity" as const,
      title: `${STATUS_LABEL[entry.status]} — ${opportunity.title}`,
      description: opportunity.companyName,
      timestamp: new Date(entry.changedAt),
      href: `/opportunities/${opportunity.id}`,
    }));
  });

  const interviewTimelineEvents: CareerEvent[] = input.interviewEvents.flatMap((interview): CareerEvent[] => {
    const scheduledEvent: CareerEvent[] =
      interview.scheduledAt !== null
        ? [
            {
              id: `interview-${interview.id}`,
              source: "interview",
              title: interview.roundLabel
                ? `${interview.roundLabel} — ${interview.opportunity.title}`
                : `Interview — ${interview.opportunity.title}`,
              description: interview.opportunity.companyName,
              timestamp: interview.scheduledAt,
              href: `/opportunities/${interview.opportunity.id}`,
            },
          ]
        : [];

    // Sprint 17 (Calendar Intelligence) — real meeting-lifecycle changes
    // (`meetingStatusHistory`, written only by `transitionMeetingStatus`)
    // become their own timeline entries alongside the scheduling one
    // above — still the "interview" source, never a second timeline.
    const history = (interview.meetingStatusHistory as unknown as { status: string; changedAt: string }[]) ?? [];
    const transitionEvents: CareerEvent[] = history
      .filter((entry) => entry.status in MEETING_STATUS_TRANSITION_LABEL)
      .map((entry) => ({
        id: `interview-${interview.id}-meeting-${entry.status}-${entry.changedAt}`,
        source: "interview" as const,
        title: `${MEETING_STATUS_TRANSITION_LABEL[entry.status]} — ${interview.opportunity.title}`,
        description: interview.opportunity.companyName,
        timestamp: new Date(entry.changedAt),
        href: `/opportunities/${interview.opportunity.id}`,
      }));

    const stageHistory = (interview.stageHistory as unknown as { stage: string; changedAt: string }[]) ?? [];
    const stageEvents: CareerEvent[] = stageHistory
      .filter((entry) => !SKIPPED_STAGE_TRANSITIONS.has(entry.stage) && entry.stage in INTERVIEW_STAGE_LABEL)
      .map((entry) => ({
        id: `interview-${interview.id}-stage-${entry.stage}-${entry.changedAt}`,
        source: "interview" as const,
        title: `${INTERVIEW_STAGE_LABEL[entry.stage as InterviewStage]} — ${interview.opportunity.title}`,
        description: interview.opportunity.companyName,
        timestamp: new Date(entry.changedAt),
        href: `/opportunities/${interview.opportunity.id}`,
      }));

    return [...scheduledEvent, ...transitionEvents, ...stageEvents];
  });

  const automationEvents = toAutomationCareerEvents(input.automationExecutions);
  const gmailEvents = input.gmailEvents ?? [];
  const recruiterEvents = input.recruiterEvents ?? [];

  return [
    ...resumeEvents,
    ...opportunityEvents,
    ...interviewTimelineEvents,
    ...automationEvents,
    ...gmailEvents,
    ...recruiterEvents,
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, input.limit ?? DEFAULT_LIMIT);
}
