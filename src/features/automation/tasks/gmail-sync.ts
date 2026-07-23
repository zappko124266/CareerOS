import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";
import { listUsersDueForGmailSync, syncGmailCareerIntelligenceForUser } from "@/features/gmail-intelligence/service";

import { exponentialBackoff } from "../policies";
import { AUTOMATION_TASK_LABEL } from "../types";
import type { AutomationTaskDefinition } from "../types";

/**
 * Wraps the Gmail Intelligence Engine (`features/gmail-intelligence/`) as
 * an Automation Task Registry entry — Sprint 16, Step 2/10. Same reuse
 * discipline as `discovery-run.ts`/`follow-up-recommendation.ts`: no
 * Gmail-specific logic lives here, only the registry-required wiring
 * (`listDue`, `checkEligibility`, `execute`, `onSuccess`). This is the
 * *only* place `runGmailIntelligenceSync` is ever called from a schedule
 * — the Career Brain / dashboard path is read-only (see
 * `gmail-intelligence/orchestrator.ts`'s own doc comment).
 */
export const gmailSyncTask: AutomationTaskDefinition<string> = {
  id: "gmail_sync",
  label: AUTOMATION_TASK_LABEL.gmail_sync,
  description:
    "Scans recent Gmail for interview invitations, recruiter messages, assessments, offers, and rejections, and adds them to your Career Timeline.",
  priority: "normal",
  requirements: ["Google connected with Gmail access", "Within the Gmail Sync plan limit"],
  // A transient Gmail API/AI Router timeout is worth one immediate retry;
  // a real failure (token revoked, not connected) fails identically on
  // retry, so this stays small — same rationale as every other task.
  retryPolicy: { maxAttempts: 2, backoffMs: exponentialBackoff(2000) },
  // Bounded the same way discovery/follow-up are — each run can take
  // real wall-clock time (several Gmail API calls plus up to 5 AI Router
  // classifications per user), and this codebase has no background job
  // queue to spread a larger batch across.
  maxPerInvocation: 5,

  listDue: async (now, limit) => listUsersDueForGmailSync(now, limit),

  checkEligibility: (userId) => checkEntitlement(userId, "GMAIL_SYNC"),

  execute: async (userId) => {
    const summary = await syncGmailCareerIntelligenceForUser(userId);
    return {
      status: "completed",
      detail: `${summary.newlyProcessed} new career email(s) processed (${summary.candidatesFound} candidates, ${summary.aiClassificationsUsed} AI-classified).`,
      metadata: { ...summary },
    };
  },

  onSuccess: (userId) => consumeEntitlement(userId, "GMAIL_SYNC"),

  getUserId: (userId) => userId,
  getSubjectId: (userId) => userId,
};
