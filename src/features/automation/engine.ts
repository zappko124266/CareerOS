import "server-only";

import { getTask } from "./registry";
import { runDueTasks } from "./scheduler";
import type { AutomationRunSummary, AutomationTaskId } from "./types";

/**
 * The Automation Engine — Sprint 5's central orchestration service. This
 * is the only entry point route handlers (or, later, a real queue
 * worker) should call. Pure architecture: this file knows nothing about
 * discovery, follow-ups, connectors, or auto-apply — it only knows how
 * to look a task up in the registry and run it via the scheduler.
 */
export async function runAutomation(taskId: AutomationTaskId, now: Date = new Date()): Promise<AutomationRunSummary> {
  const task = getTask(taskId);
  return runDueTasks(task, now);
}
