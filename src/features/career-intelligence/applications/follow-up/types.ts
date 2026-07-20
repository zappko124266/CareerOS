import type { z } from "zod";

import type { FollowUpInputSchema, FollowUpOutputSchema } from "./schema";

export type FollowUpInput = z.infer<typeof FollowUpInputSchema>;
export type FollowUpOutput = z.infer<typeof FollowUpOutputSchema>;

export const FOLLOW_UP_RECOMMENDATION_TYPES = [
  "FOLLOW_UP_NOW",
  "WAIT",
  "SEND_REMINDER",
  "UPDATE_RESUME",
  "WITHDRAW",
  "APPLY_ELSEWHERE",
] as const;
export type FollowUpRecommendationType = (typeof FOLLOW_UP_RECOMMENDATION_TYPES)[number];
