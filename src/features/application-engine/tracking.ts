import "server-only";

import { listAutomationExecutions, recordExecution } from "@/features/automation/history";
import type { AutomationExecution, AutomationTaskStatus } from "@/features/automation/types";

const TASK_ID = "application_engine_review" as const;
const HISTORY_FETCH_LIMIT = 50;

/**
 * Auditable execution history — Sprint 9, requirement 10. A thin wrapper
 * over Sprint 5's Execution History (`features/automation/history.ts`,
 * `AuditLog`-backed) filtered to this engine's task id — no second
 * history mechanism, no new Prisma model.
 */
export async function recordApplicationDecision(entry: {
  userId: string;
  opportunityId: string;
  status: AutomationTaskStatus;
  detail: string;
}): Promise<void> {
  await recordExecution({
    taskId: TASK_ID,
    userId: entry.userId,
    subjectId: entry.opportunityId,
    status: entry.status,
    detail: entry.detail,
    attempt: 1,
  });
}

export async function listApplicationEngineHistory(userId: string, limit = 10): Promise<AutomationExecution[]> {
  const executions = await listAutomationExecutions(userId, HISTORY_FETCH_LIMIT);
  return executions.filter((execution) => execution.taskId === TASK_ID).slice(0, limit);
}
