import type { AutomationPriority } from "@/features/automation/types";
import type { NextStepStage } from "@/features/coach/recommend-next-step";

import { AGENT_ACTION_CATEGORY_ORDER, AGENT_ACTION_PRIORITY_WEIGHT } from "./policies";
import { deriveAgentStatus } from "./status";
import type { AgentAction, AgentActionCategory, AgentActionPlan, AgentPlanningInput } from "./types";

/** Maps the Coach's own priority chain (`recommendNextStep`) onto an
 * action category — reused, not re-derived: this table adds no new
 * eligibility logic, only a label for one already-decided stage.
 * `"healthy"` is deliberately absent — it produces no action. */
const ACTION_FROM_STAGE: Partial<Record<NextStepStage, { category: AgentActionCategory; priority: AutomationPriority }>> = {
  resume_missing: { category: "update_resume", priority: "high" },
  resume_poor: { category: "update_resume", priority: "high" },
  linkedin_missing: { category: "update_linkedin", priority: "normal" },
  jobs_missing: { category: "discover_jobs", priority: "high" },
  applications_missing: { category: "review_applications", priority: "normal" },
  interview_missing: { category: "recommend_interview_prep", priority: "high" },
};

/**
 * The Autonomous Career Agent's deterministic planning loop — Step 3.
 * Pure and synchronous, same idiom as `recommendNextStep`/
 * `getCareerAgentSnapshot`/`buildDailyMission`: every branch reads one
 * real field off `AgentPlanningInput` (itself assembled by
 * `orchestrator.ts` from Career Brain, the Career Agent snapshot, the
 * Connection Manager, and the Automation Engine registry) and every
 * `AgentAction` this produces traces back to that real field — no AI
 * call, no invented text, no timestamp asserted as historical fact.
 *
 * One action per category except `refresh_connector`, which can appear
 * once per broken connection — a user with both an expired Google and an
 * expired Microsoft connection needs to see both, not one collapsed into
 * the other.
 */
export function buildAgentActionPlan(input: AgentPlanningInput, now: Date): AgentActionPlan {
  const byCategory = new Map<AgentActionCategory, AgentAction>();

  function upsert(action: AgentAction): void {
    const existing = byCategory.get(action.category);
    if (!existing || AGENT_ACTION_PRIORITY_WEIGHT[action.priority] > AGENT_ACTION_PRIORITY_WEIGHT[existing.priority]) {
      byCategory.set(action.category, action);
    }
  }

  if (input.nextStep.stage !== "healthy") {
    const mapped = ACTION_FROM_STAGE[input.nextStep.stage];
    if (mapped) {
      upsert({
        id: `coach:${input.nextStep.stage}`,
        category: mapped.category,
        title: input.nextStep.title,
        why: input.nextStep.why,
        priority: mapped.priority,
        href: input.nextStep.href,
        automationTaskId: null,
      });
    }
  }

  if (input.dueTasks.job_discovery_run) {
    upsert({
      id: "automation:job_discovery_run",
      category: "discover_jobs",
      title: "Run job discovery",
      why: "Your discovery preferences say it's time for a fresh search.",
      priority: "normal",
      href: "/opportunities/discovery",
      automationTaskId: "job_discovery_run",
    });
  }

  // Sprint 18 — a fully-prepared application literally waiting on a
  // yes/no is the most concrete, most actionable state this category can
  // be in, so it's checked before the AI-review backlog (which is a
  // step earlier in the same pipeline — see
  // `features/application-engine/application-orchestrator.ts`).
  if (input.applicationExecutionSummary.waitingApproval.length > 0) {
    const count = input.applicationExecutionSummary.waitingApproval.length;
    upsert({
      id: "application-engine:waiting-approval",
      category: "review_applications",
      title: "Approve pending applications",
      why: `${count} application${count === 1 ? "" : "s"} fully prepared and waiting on your approval.`,
      priority: "high",
      href: "/applications",
      automationTaskId: null,
    });
  }
  // A concrete review backlog is more actionable than "a review is about
  // to run" — only fall back to the latter when there's no backlog yet.
  else if (input.applicationEngineSummary.readyForManualReviewCount > 0) {
    const count = input.applicationEngineSummary.readyForManualReviewCount;
    upsert({
      id: "application-engine:backlog",
      category: "review_applications",
      title: "Review AI-reviewed applications",
      why: `${count} application${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready for your decision.`,
      priority: "high",
      href: "/applications",
      automationTaskId: null,
    });
  } else if (input.dueTasks.application_engine_review) {
    upsert({
      id: "automation:application_engine_review",
      category: "review_applications",
      title: "Review saved opportunities",
      why: "Saved opportunities are due for an AI review pass.",
      priority: "low",
      href: "/applications",
      automationTaskId: "application_engine_review",
    });
  }

  if (input.dueTasks.follow_up_recommendation) {
    upsert({
      id: "automation:follow_up_recommendation",
      category: "recommend_follow_up",
      title: "Follow up on quiet applications",
      why: "Some applications have gone quiet and could use a follow-up nudge.",
      priority: "low",
      href: "/applications",
      automationTaskId: "follow_up_recommendation",
    });
  }

  // Sprint 20 (Interview Intelligence), Module 12 — "detects waiting too
  // long, suggests follow-up... never execute actions automatically, only
  // recommend." Folds into the existing `recommend_follow_up` category
  // (never a new one) since it's the same kind of recommendation, just
  // grounded in a specific, real, calendar/Gmail-verified interview
  // rather than a generic application-quiet signal — `upsert`'s
  // priority-wins rule means this one surfaces over the generic nudge
  // above when both are true.
  const longestWaiting = input.interviewIntelligence.waitingTooLong[0];
  if (longestWaiting) {
    upsert({
      id: `interview:waiting:${longestWaiting.id}`,
      category: "recommend_follow_up",
      title: `Follow up — ${longestWaiting.opportunity.companyName}`,
      why: `No movement in ${longestWaiting.daysWaiting} days since the last update on this interview.`,
      priority: "normal",
      href: `/opportunities/${longestWaiting.opportunity.id}`,
      automationTaskId: null,
    });
  }

  // Sprint 21 (Recruiter Intelligence & Networking Operating System),
  // Module 12 — "detects recruiter... reconnect, thank recruiter... never
  // execute actions automatically, only recommend." Same `upsert` into
  // the existing `recommend_follow_up` category (never a new one) as the
  // interview-waiting block above; whichever of the two is more urgent
  // wins the slot via `upsert`'s priority rule.
  const coolestRecruiter = input.pendingRecruiterFollowUps[0];
  if (coolestRecruiter) {
    upsert({
      id: `recruiter:waiting:${coolestRecruiter.id}`,
      category: "recommend_follow_up",
      title: `Reconnect with ${coolestRecruiter.name}`,
      why: `${coolestRecruiter.daysSinceLastInteraction} days since your last logged interaction — relationship is ${coolestRecruiter.health.toLowerCase()}.`,
      priority: "normal",
      href: `/recruiters/${coolestRecruiter.id}`,
      automationTaskId: null,
    });
  }

  // Step 13 (Sprint 17) — a calendar/Gmail-verified interview today or
  // tomorrow is more specific and more urgent than the Coach's generic
  // "interview_missing" recommendation above, so it deliberately
  // overwrites (not `upsert`s — priority ties would otherwise leave the
  // generic one in place) whatever `recommend_interview_prep` entry the
  // Coach block already set.
  const todaysInterview = input.interviewIntelligence.todaysInterviews[0];
  const tomorrowsInterview = input.interviewIntelligence.upcomingInterviews.find(
    (event) => event.lifecycleLabel === "INTERVIEW_TOMORROW",
  );
  const urgentInterview = todaysInterview ?? tomorrowsInterview;
  if (urgentInterview) {
    const when = todaysInterview ? "today" : "tomorrow";
    byCategory.set("recommend_interview_prep", {
      id: `interview:${when}:${urgentInterview.id}`,
      category: "recommend_interview_prep",
      title: `Interview ${when} — ${urgentInterview.opportunity.companyName}`,
      why: urgentInterview.roundLabel ?? "Make sure you're ready.",
      priority: "high",
      href: `/opportunities/${urgentInterview.opportunity.id}`,
      automationTaskId: null,
    });
  }

  const actions = Array.from(byCategory.values());

  // Step 9/12 (Sprint 17) — one action per real, persisted scheduling
  // conflict (`Interview.hasConflict`, written only by `calendar_sync` —
  // never recomputed here). Pushed directly, like `refresh_connector`,
  // since a user can have more than one.
  for (const conflict of input.interviewIntelligence.conflicts) {
    actions.push({
      id: `conflict:${conflict.id}`,
      category: "resolve_scheduling_conflict",
      title: `Scheduling conflict — ${conflict.opportunity.companyName}`,
      why: conflict.conflictNote ?? "This interview overlaps with another event on your calendar.",
      priority: "high",
      href: `/opportunities/${conflict.opportunity.id}`,
      automationTaskId: null,
    });
  }

  for (const summary of input.connectionSummaries) {
    if (summary.status !== "EXPIRED" && summary.status !== "ERROR") continue;
    const label = summary.provider.charAt(0) + summary.provider.slice(1).toLowerCase();
    actions.push({
      id: `connector:${summary.provider}`,
      category: "refresh_connector",
      title: `Reconnect ${label}`,
      why: summary.lastError ?? `Your ${label} connection has ${summary.status === "EXPIRED" ? "expired" : "an error"}.`,
      priority: "high",
      href: "/opportunities/connections",
      automationTaskId: null,
    });
  }

  // Step 7 (Sprint 16) — one action per *most recent* item in each
  // Gmail-derived category, never the whole backlog (that would flood
  // the plan with one row per email). Rejections are deliberately
  // excluded — they're informational, not something the user needs to
  // act on. All four link to the Career Identity Timeline tab, where
  // `careerMemory`'s merge (`features/career-agent/inbox.ts`) already
  // surfaces the same underlying `GmailCareerEvent` rows.
  const GMAIL_ACTIONS: { events: typeof input.gmailIntelligence.recentOffers; label: string; priority: AutomationPriority }[] = [
    { events: input.gmailIntelligence.recentOffers, label: "offer", priority: "high" },
    { events: input.gmailIntelligence.interviewInvitations, label: "interview invitation", priority: "high" },
    { events: input.gmailIntelligence.pendingAssessments, label: "assessment", priority: "high" },
    { events: input.gmailIntelligence.recentRecruiterActivity, label: "recruiter message", priority: "normal" },
  ];
  for (const { events, label, priority } of GMAIL_ACTIONS) {
    const latest = events[0];
    if (!latest) continue;
    actions.push({
      id: `gmail:${latest.id}`,
      category: "review_career_email",
      title: `New ${label}${latest.company ? ` — ${latest.company}` : ""}`,
      why: latest.subject,
      priority,
      href: "/settings/identity?tab=timeline",
      automationTaskId: null,
    });
  }

  actions.sort(
    (a, b) =>
      AGENT_ACTION_PRIORITY_WEIGHT[b.priority] - AGENT_ACTION_PRIORITY_WEIGHT[a.priority] ||
      AGENT_ACTION_CATEGORY_ORDER.indexOf(a.category) - AGENT_ACTION_CATEGORY_ORDER.indexOf(b.category),
  );

  const { status, detail } = deriveAgentStatus(input, actions, now);

  return { status, statusDetail: detail, actions, generatedAt: now };
}
