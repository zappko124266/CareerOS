import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const FollowUpInputSchema = z.object({
  roleTitle: z.string().min(1, "roleTitle is required"),
  companyName: z.string().min(1, "companyName is required"),
  /** The opportunity's current self-reported status label, e.g. "APPLIED",
   * "INTERVIEWING" — plain string, not the Prisma enum type, so this
   * module stays independent of the schema (same convention as
   * `OpportunityStatus` mirrors elsewhere in the codebase). */
  currentStatus: z.string().min(1),
  /** Whole days since the status last changed — computed in code from
   * `Opportunity.updatedAt`/`statusHistory`, never estimated by the model. */
  daysSinceLastUpdate: z.number().int().min(0),
  /** Whole days since the application was submitted (APPLIED), if ever —
   * `null` when the opportunity hasn't reached APPLIED yet. */
  daysSinceApplied: z.number().int().min(0).nullable(),
  hasRecruiterContact: z.boolean(),
});

export const FollowUpOutputSchema = z.object({
  recommendationType: z.enum([
    "FOLLOW_UP_NOW",
    "WAIT",
    "SEND_REMINDER",
    "UPDATE_RESUME",
    "WITHDRAW",
    "APPLY_ELSEWHERE",
  ]),
  reasoning: z.string(),
  confidence: scoreSchema,
});
