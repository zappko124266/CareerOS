import "server-only";

import { executeTask } from "./executor";
import type { AutomationRunSummary, AutomationTaskDefinition } from "./types";

/**
 * The Scheduler — Sprint 5. Deterministic due-task selection: given a
 * task definition and "now," find who/what is due (bounded to
 * `maxPerInvocation`, same discipline the two cron routes already used)
 * and execute each sequentially. "Future cron compatible" means any real
 * caller — Vercel Cron today via the two routes below, a real queue
 * worker later — calls this exact function; nothing about it assumes
 * Vercel Cron specifically.
 *
 * Processing is sequential, not parallel, matching this codebase's
 * existing cron routes — this bounds concurrent DB/AI Router load per
 * invocation rather than firing `maxPerInvocation` requests at once.
 */
export async function runDueTasks<TSubject>(
  task: AutomationTaskDefinition<TSubject>,
  now: Date,
): Promise<AutomationRunSummary> {
  const due = await task.listDue(now, task.maxPerInvocation);

  const results = [];
  for (const subject of due) {
    results.push(await executeTask(task, subject));
  }

  return {
    taskId: task.id,
    dueCount: due.length,
    processedCount: due.length,
    results,
  };
}
