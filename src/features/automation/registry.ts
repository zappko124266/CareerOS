import { applicationEngineReviewTask } from "./tasks/application-engine-review";
import { calendarSyncTask } from "./tasks/calendar-sync";
import { followUpRecommendationTask } from "./tasks/follow-up-recommendation";
import { gmailSyncTask } from "./tasks/gmail-sync";
import { jobDiscoveryRunTask } from "./tasks/discovery-run";
import type { AutomationTaskDefinition, AutomationTaskId } from "./types";

/**
 * The Task Registry — Sprint 5. The only place every automation task is
 * listed. To register a future task (a portal connector sync): write one
 * `AutomationTaskDefinition` in `tasks/`, add its id to `AutomationTaskId`
 * (`types.ts`), and add it here. `engine.ts`/`executor.ts`/`scheduler.ts`
 * never need to change. `application_engine_review` (Sprint 9) is the
 * first task that will start actually submitting applications the
 * moment a real Easy-Apply connector exists — see
 * `features/application-engine/`.
 */
const AUTOMATION_TASKS: Record<AutomationTaskId, AutomationTaskDefinition<unknown>> = {
  job_discovery_run: jobDiscoveryRunTask,
  follow_up_recommendation: followUpRecommendationTask,
  application_engine_review: applicationEngineReviewTask,
  gmail_sync: gmailSyncTask,
  calendar_sync: calendarSyncTask,
};

export function getTask(taskId: AutomationTaskId): AutomationTaskDefinition<unknown> {
  return AUTOMATION_TASKS[taskId];
}

export function listTasks(): AutomationTaskDefinition<unknown>[] {
  return Object.values(AUTOMATION_TASKS);
}
