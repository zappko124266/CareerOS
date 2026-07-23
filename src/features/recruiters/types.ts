import type { z } from "zod";

import type {
  CreateReferralInputSchema,
  CreateRecruiterInputSchema,
  DeleteReferralInputSchema,
  DeleteRecruiterInputSchema,
  DeleteRecruiterInteractionInputSchema,
  LogRecruiterInteractionInputSchema,
  RecruiterInteractionTypeSchema,
  RecruiterPrioritySchema,
  ReferralStatusSchema,
  UpdateReferralStatusInputSchema,
  UpdateRecruiterInputSchema,
} from "./schema";

export type RecruiterInteractionType = z.infer<typeof RecruiterInteractionTypeSchema>;
export type RecruiterPriority = z.infer<typeof RecruiterPrioritySchema>;
export type CreateRecruiterInput = z.infer<typeof CreateRecruiterInputSchema>;
export type UpdateRecruiterInput = z.infer<typeof UpdateRecruiterInputSchema>;
export type DeleteRecruiterInput = z.infer<typeof DeleteRecruiterInputSchema>;
export type LogRecruiterInteractionInput = z.infer<typeof LogRecruiterInteractionInputSchema>;
export type DeleteRecruiterInteractionInput = z.infer<typeof DeleteRecruiterInteractionInputSchema>;

export type ReferralStatus = z.infer<typeof ReferralStatusSchema>;
export type CreateReferralInput = z.infer<typeof CreateReferralInputSchema>;
export type UpdateReferralStatusInput = z.infer<typeof UpdateReferralStatusInputSchema>;
export type DeleteReferralInput = z.infer<typeof DeleteReferralInputSchema>;

export const RECRUITER_PRIORITY_LABEL: Record<RecruiterPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
};

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  REQUESTED: "Requested",
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

export const REFERRAL_STATUSES: ReferralStatus[] = ["REQUESTED", "PENDING", "ACCEPTED", "REJECTED", "COMPLETED"];

export const RECRUITER_INTERACTION_TYPE_LABEL: Record<RecruiterInteractionType, string> = {
  VIEWED_PROFILE: "Viewed profile",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  INTERVIEW_REQUESTED: "Interview requested",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  HIRED: "Hired",
};

export const RECRUITER_INTERACTION_TYPES: RecruiterInteractionType[] = [
  "VIEWED_PROFILE",
  "CONTACTED",
  "REPLIED",
  "INTERVIEW_REQUESTED",
  "REJECTED",
  "GHOSTED",
  "HIRED",
];
