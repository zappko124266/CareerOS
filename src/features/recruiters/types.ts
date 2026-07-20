import type { z } from "zod";

import type {
  CreateRecruiterInputSchema,
  DeleteRecruiterInputSchema,
  DeleteRecruiterInteractionInputSchema,
  LogRecruiterInteractionInputSchema,
  RecruiterInteractionTypeSchema,
  UpdateRecruiterInputSchema,
} from "./schema";

export type RecruiterInteractionType = z.infer<typeof RecruiterInteractionTypeSchema>;
export type CreateRecruiterInput = z.infer<typeof CreateRecruiterInputSchema>;
export type UpdateRecruiterInput = z.infer<typeof UpdateRecruiterInputSchema>;
export type DeleteRecruiterInput = z.infer<typeof DeleteRecruiterInputSchema>;
export type LogRecruiterInteractionInput = z.infer<typeof LogRecruiterInteractionInputSchema>;
export type DeleteRecruiterInteractionInput = z.infer<typeof DeleteRecruiterInteractionInputSchema>;

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
