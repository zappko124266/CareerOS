import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { listUsersDueForDiscovery } from "@/features/discovery/queries";
import { runDiscovery } from "@/features/discovery/run-discovery";

import { exponentialBackoff } from "../policies";
import { AUTOMATION_TASK_LABEL } from "../types";
import type { AutomationTaskDefinition } from "../types";

/**
 * Wraps the already-shipping Background Discovery Engine
 * (`features/discovery/run-discovery.ts`'s `runDiscovery`, previously
 * called directly from `/api/cron/discovery`'s own loop) as one
 * Automation Task Registry entry. No discovery-specific logic was
 * rewritten — this file only wires the existing due-list, entitlement,
 * and execution functions into the generic engine contract.
 */
export const jobDiscoveryRunTask: AutomationTaskDefinition<string> = {
  id: "job_discovery_run",
  label: AUTOMATION_TASK_LABEL.job_discovery_run,
  description:
    "Searches configured connectors and ranks new opportunities against the user's resume and preferences.",
  priority: "normal",
  requirements: ["Discovery preferences configured", "A parsed resume", "Within the Job Discovery Run plan limit"],
  // A transient connector/AI Router timeout is worth one immediate
  // retry; a real failure (e.g. missing preferences) will fail the
  // retry identically, so this stays small.
  retryPolicy: { maxAttempts: 2, backoffMs: exponentialBackoff(2000) },
  // Same bound `/api/cron/discovery` already used, for the same reason:
  // each run can legitimately take minutes of AI Router time, and this
  // codebase has no background job queue to spread a larger batch across.
  maxPerInvocation: 5,

  listDue: async (now, limit) => (await listUsersDueForDiscovery(now)).slice(0, limit),

  checkEligibility: (userId) => checkEntitlement(userId, "JOB_DISCOVERY_RUN"),

  execute: async (userId) => {
    const summary = await runDiscovery(userId, "SCHEDULED");
    return {
      status: "completed",
      detail: `${summary.newJobsFound} new job(s), ${summary.companiesFound} compan(y/ies) found.`,
      metadata: { runId: summary.runId, newJobsFound: summary.newJobsFound, companiesFound: summary.companiesFound },
    };
  },

  onSuccess: (userId) => consumeEntitlement(userId, "JOB_DISCOVERY_RUN"),

  getUserId: (userId) => userId,
  getSubjectId: (userId) => userId,
};
