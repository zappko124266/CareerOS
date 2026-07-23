import "server-only";

import { logger } from "@/lib/logger";

import { recordExecution } from "./history";
import { withRetry } from "./policies";
import type { AutomationTaskDefinition, AutomationTaskResult } from "./types";

/**
 * The Task Executor — Sprint 5. Fully generic over `TSubject`: no
 * portal-specific or task-specific knowledge lives here. Checks real
 * eligibility, executes with the Retry Engine, records real Execution
 * History either way, and never throws — a failed task is a recorded
 * outcome, not an unhandled exception that would take down the rest of
 * a scheduled batch.
 */
export async function executeTask<TSubject>(
  task: AutomationTaskDefinition<TSubject>,
  subject: TSubject,
): Promise<AutomationTaskResult> {
  const userId = task.getUserId(subject);
  const subjectId = task.getSubjectId(subject);

  const eligibility = await task.checkEligibility(subject);
  if (!eligibility.allowed) {
    const result: AutomationTaskResult = { status: "skipped", detail: eligibility.reason };
    await recordExecution({
      taskId: task.id,
      userId,
      subjectId,
      status: "skipped",
      detail: result.detail,
      attempt: 0,
    });
    return result;
  }

  let lastAttempt = 0;
  try {
    const result = await withRetry(async (attempt) => {
      lastAttempt = attempt;
      return task.execute(subject);
    }, task.retryPolicy);

    await task.onSuccess(subject);
    await recordExecution({
      taskId: task.id,
      userId,
      subjectId,
      status: "completed",
      detail: result.detail,
      attempt: lastAttempt,
    });
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error("automation.task_failed", { taskId: task.id, userId, subjectId, detail });
    await recordExecution({
      taskId: task.id,
      userId,
      subjectId,
      status: "failed",
      detail,
      attempt: lastAttempt,
    });
    return { status: "failed", detail };
  }
}
