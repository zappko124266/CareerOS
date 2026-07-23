import "server-only";

import { getTask, listTasks } from "@/features/automation/registry";
import type { AutomationTaskId } from "@/features/automation/types";
import type { CareerAgentSnapshot } from "@/features/career-agent/types";
import type { CareerBrain } from "@/features/career-brain/types";

import { buildDailySchedule } from "./scheduler";
import { DUE_TASK_SCAN_LIMIT } from "./policies";
import { buildAgentActionPlan } from "./planner";
import { deriveAutonomousAgentEvents } from "./events";
import type { AgentPlanningInput, AutonomousAgentReport, TodaysProgress } from "./types";

/**
 * The Autonomous Career Agent's orchestrator — Step 2's "single
 * coordination point." This is deliberately **not** a new background
 * process, queue worker, or cron entry: Vercel Functions are stateless
 * between invocations (the same constraint `features/automation/policies.ts`
 * documents for the Retry Engine), so there is nothing in this codebase
 * for a persistent "agent" to run inside between requests. What this
 * function actually does is coordinate — on a single request, at read
 * time — the real state that already exists across four systems (Career
 * Brain — including `raw.connectionSummaries`, fetched once by
 * `getCareerBrain` itself since Sprint 16 rather than by this file — the
 * Career Agent snapshot, the Connection Manager, and the Automation
 * Engine's own task registry) into one prioritized plan, status, event
 * list, and suggested schedule. The two real,
 * already-scheduled cron routes (`/api/cron/discovery`,
 * `/api/cron/follow-up`, see `vercel.json`) are completely untouched —
 * this function calls into the Automation Engine's registry read-only
 * (`getTask(...).listDue`/`checkEligibility`), it never calls
 * `runAutomation`/`executeTask` itself. Adding a scheduled invocation of
 * this orchestrator later (e.g. to persist a snapshot) is a real future
 * option, but not something this sprint's "orchestration only" scope
 * asked for — see the Sprint 15 report's "Remaining work."
 */
export async function runAutonomousAgentCycle(
  brain: CareerBrain,
  snapshot: CareerAgentSnapshot,
  now: Date = new Date(),
): Promise<AutonomousAgentReport> {
  const tasks = listTasks();

  const [dueEntries, jobDiscoveryEligibility] = await Promise.all([
    Promise.all(
      tasks.map(async (task) => {
        const due = await task.listDue(now, DUE_TASK_SCAN_LIMIT);
        const isDue = due.some((subject) => task.getUserId(subject) === brain.userId);
        return [task.id, isDue] as const;
      }),
    ),
    getTask("job_discovery_run").checkEligibility(brain.userId),
  ]);

  const dueTasks: Partial<Record<AutomationTaskId, boolean>> = Object.fromEntries(dueEntries);

  const planningInput: AgentPlanningInput = {
    nextStep: brain.raw.nextStep,
    connectionSummaries: brain.raw.connectionSummaries,
    automationExecutions: brain.raw.automationExecutions,
    careerMemory: brain.careerMemory,
    applicationEngineSummary: snapshot.applicationEngineSummary,
    applicationExecutionSummary: brain.applicationEngineExecutionSummary,
    hasUpcomingInterview: snapshot.upcomingInterviews.length > 0,
    dueTasks,
    jobDiscoveryEligible: jobDiscoveryEligibility.allowed,
    gmailIntelligence: brain.gmailIntelligence,
    interviewIntelligence: brain.interviewIntelligence,
    pendingRecruiterFollowUps: brain.pendingFollowUps,
  };

  const plan = buildAgentActionPlan(planningInput, now);
  const events = deriveAutonomousAgentEvents(planningInput, now);
  const schedule = buildDailySchedule(plan.actions);
  const todaysProgress = computeTodaysProgress(planningInput, tasks.map((task) => task.id), now);

  return { plan, events, schedule, todaysProgress };
}

/** How many of the registered automation task *types* (not individual
 * executions — `follow_up_recommendation` alone can produce many rows
 * per day, one per opportunity) produced at least one completed run
 * today, out of how many are registered. Real, bounded, and honest about
 * its own denominator — it never claims a task "should" have run today
 * beyond what the registry actually lists. */
function computeTodaysProgress(input: AgentPlanningInput, registeredTaskIds: AutomationTaskId[], now: Date): TodaysProgress {
  const completedToday = new Set(
    input.automationExecutions
      .filter((execution) => execution.status === "completed" && execution.timestamp.toDateString() === now.toDateString())
      .map((execution) => execution.taskId),
  );

  return { completed: completedToday.size, total: registeredTaskIds.length };
}
