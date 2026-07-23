import { listOpportunitiesDueForFollowUp } from "@/features/applications/queries";
import { generateFollowUpRecommendation } from "@/features/applications/service";
import { checkEntitlement, consumeEntitlement } from "@/features/entitlements/service";

import { exponentialBackoff } from "../policies";
import { AUTOMATION_TASK_LABEL } from "../types";
import type { AutomationTaskDefinition } from "../types";

export interface FollowUpSubject {
  opportunityId: string;
  userId: string;
}

/**
 * Wraps the already-shipping AI Follow-up Engine
 * (`features/applications/service.ts`'s `generateFollowUpRecommendation`,
 * previously called directly from `/api/cron/follow-up`'s own loop) as
 * one Automation Task Registry entry — same reuse discipline as
 * `discovery-run.ts`.
 */
export const followUpRecommendationTask: AutomationTaskDefinition<FollowUpSubject> = {
  id: "follow_up_recommendation",
  label: AUTOMATION_TASK_LABEL.follow_up_recommendation,
  description: "Generates a follow-up recommendation for applications that have gone quiet.",
  priority: "low",
  requirements: ["An active application with no recent status change", "Within the Follow-up Recommendation plan limit"],
  retryPolicy: { maxAttempts: 2, backoffMs: exponentialBackoff(2000) },
  // Same bound `/api/cron/follow-up` already used.
  maxPerInvocation: 10,

  listDue: (now, limit) => listOpportunitiesDueForFollowUp(now, limit),

  checkEligibility: (subject) => checkEntitlement(subject.userId, "FOLLOW_UP_RECOMMENDATION"),

  execute: async (subject) => {
    const recommendation = await generateFollowUpRecommendation(subject.opportunityId, subject.userId);
    return {
      status: "completed",
      detail: `Recommended: ${recommendation.recommendationType}.`,
      metadata: { recommendationType: recommendation.recommendationType },
    };
  },

  onSuccess: (subject) => consumeEntitlement(subject.userId, "FOLLOW_UP_RECOMMENDATION"),

  getUserId: (subject) => subject.userId,
  getSubjectId: (subject) => subject.opportunityId,
};
