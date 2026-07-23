/**
 * Sprint 5 — Automation Engine. These are the only generic contracts the
 * engine/executor/scheduler know about — zero portal- or task-specific
 * logic lives here. Adding a future task (a portal connector sync, an
 * auto-apply submission) means writing one new `AutomationTaskDefinition`
 * in `tasks/` and registering it in `registry.ts`; nothing in this file
 * or `engine.ts`/`executor.ts`/`scheduler.ts` needs to change.
 */

export type AutomationTaskId =
  | "job_discovery_run"
  | "follow_up_recommendation"
  | "application_engine_review"
  | "gmail_sync"
  | "calendar_sync";

export const AUTOMATION_TASK_LABEL: Record<AutomationTaskId, string> = {
  job_discovery_run: "Job Discovery Run",
  follow_up_recommendation: "Follow-up Recommendation",
  application_engine_review: "Application Engine Review",
  gmail_sync: "Gmail Intelligence Sync",
  calendar_sync: "Calendar Intelligence Sync",
};

export type AutomationPriority = "high" | "normal" | "low";

export type AutomationTaskStatus = "completed" | "skipped" | "failed";

/** Deterministic — `backoffMs` is a pure function of attempt number,
 * never randomized or AI-decided, so a run's timing is always
 * reproducible. */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: (attempt: number) => number;
}

export interface AutomationTaskResult {
  status: AutomationTaskStatus;
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface EligibilityCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * One task type's full definition — metadata, retry policy, and the real
 * functions that do the work. `TSubject` is whatever one unit of work is
 * (a `userId` for a per-user task, an `{ opportunityId, userId }` pair
 * for a per-opportunity task, etc.).
 */
/**
 * Note: the members below intentionally use *method shorthand* syntax
 * (`listDue(...)`, not `listDue: (...) => ...`). TypeScript checks
 * method-shorthand parameters bivariantly, which is what lets
 * `registry.ts` hold task definitions of different concrete `TSubject`
 * types (a `userId` string, an `{ opportunityId, userId }` pair) in one
 * array without an `any`/type-erasure cast — every task's methods are
 * always invoked with subjects that same task's own `listDue` produced,
 * so this is safe in practice even though it relaxes strict variance
 * checking.
 */
export interface AutomationTaskDefinition<TSubject> {
  id: AutomationTaskId;
  label: string;
  description: string;
  priority: AutomationPriority;
  /** Human-readable, documentation/UI-facing only — the actual
   * enforcement is `listDue`/`checkEligibility` below, never this list
   * alone. */
  requirements: string[];
  retryPolicy: RetryPolicy;
  maxPerInvocation: number;
  /** Real eligibility query — reuses each feature's own existing "who/what
   * is due right now" query, never reimplemented here. */
  listDue(now: Date, limit: number): Promise<TSubject[]>;
  /** Real entitlement/plan check for this specific subject. */
  checkEligibility(subject: TSubject): Promise<EligibilityCheck>;
  /** The actual deterministic work — reuses an existing service
   * function; never a stub. */
  execute(subject: TSubject): Promise<AutomationTaskResult>;
  /** Called only after `execute` succeeds. */
  onSuccess(subject: TSubject): Promise<void>;
  getUserId(subject: TSubject): string;
  getSubjectId(subject: TSubject): string;
}

export interface AutomationRunSummary {
  taskId: AutomationTaskId;
  dueCount: number;
  processedCount: number;
  results: AutomationTaskResult[];
}

/** One row of Execution History — reshaped from `AuditLog`
 * (`automation.task_*` actions), never a new Prisma model. */
export interface AutomationExecution {
  id: string;
  taskId: AutomationTaskId;
  userId: string | null;
  subjectId: string | null;
  status: AutomationTaskStatus;
  detail: string | null;
  attempt: number;
  timestamp: Date;
}
