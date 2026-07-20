import type { z } from "zod";

import type {
  CareerProgressionInputSchema,
  CareerProgressionOutputSchema,
  SuggestedRoleSchema,
} from "./schema";

export type CareerProgressionInput = z.infer<
  typeof CareerProgressionInputSchema
>;
export type CareerProgressionOutput = z.infer<
  typeof CareerProgressionOutputSchema
>;
export type SuggestedRole = z.infer<typeof SuggestedRoleSchema>;
