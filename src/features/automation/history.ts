import "server-only";

import type { CareerEvent } from "@/features/career-agent/types";
import type { AuditAction } from "@/lib/audit";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { AuditLog } from "@/generated/prisma/client";

import { AUTOMATION_TASK_LABEL } from "./types";
import type { AutomationExecution, AutomationTaskId, AutomationTaskStatus } from "./types";

const AUTOMATION_ACTIONS: AuditAction[] = [
  "automation.task_completed",
  "automation.task_failed",
  "automation.task_skipped",
];

interface AutomationMetadata {
  taskId: AutomationTaskId;
  subjectId: string | null;
  detail: string | null;
  attempt: number;
}

/**
 * Execution History — Sprint 5. Reuses `AuditLog` (already persisted,
 * already indexed on `userId`/`action`/`createdAt`) as the unified
 * history model instead of a new Prisma model — the same append-only
 * event log every other feature's audit trail already writes to.
 */
export async function recordExecution(entry: {
  taskId: AutomationTaskId;
  userId: string;
  subjectId: string;
  status: AutomationTaskStatus;
  detail?: string;
  attempt: number;
}): Promise<void> {
  const action: AuditAction = `automation.task_${entry.status}`;
  await logAuditEvent(action, {
    userId: entry.userId,
    metadata: {
      taskId: entry.taskId,
      subjectId: entry.subjectId,
      detail: entry.detail ?? null,
      attempt: entry.attempt,
    },
  });
}

function statusFromAction(action: string): AutomationTaskStatus {
  if (action === "automation.task_completed") return "completed";
  if (action === "automation.task_skipped") return "skipped";
  return "failed";
}

function toAutomationExecution(row: AuditLog): AutomationExecution {
  const metadata = (row.metadata ?? {}) as Partial<AutomationMetadata>;
  return {
    id: row.id,
    taskId: metadata.taskId ?? "job_discovery_run",
    userId: row.userId,
    subjectId: metadata.subjectId ?? null,
    status: statusFromAction(row.action),
    detail: metadata.detail ?? null,
    attempt: metadata.attempt ?? 0,
    timestamp: row.createdAt,
  };
}

/** Every automation execution for one user, most recent first — the
 * Career Agent's "Career Agent Status" widget and the Career Inbox both
 * read this same query, never a second history source. */
export async function listAutomationExecutions(userId: string, limit = 10): Promise<AutomationExecution[]> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, action: { in: AUTOMATION_ACTIONS } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(toAutomationExecution);
}

/**
 * Feeds the Career Inbox — Sprint 3's `CareerEventSource` union
 * documented this exact extension point ("adding a future external
 * event source means one more literal plus one new builder function").
 * Reuses the same rows `listAutomationExecutions` already reads — no
 * duplicate event logic.
 */
export function toCareerEvents(executions: AutomationExecution[]): CareerEvent[] {
  return executions.map((execution) => ({
    id: `automation-${execution.id}`,
    source: "automation",
    title: `${AUTOMATION_TASK_LABEL[execution.taskId]} — ${execution.status}`,
    description: execution.detail ?? "No additional detail.",
    timestamp: execution.timestamp,
    href: "/dashboard",
  }));
}
