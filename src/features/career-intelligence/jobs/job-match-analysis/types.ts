import type { z } from "zod";

import type {
  JobMatchAnalysisInputSchema,
  JobMatchAnalysisOutputSchema,
} from "./schema";

export type JobMatchAnalysisInput = z.infer<typeof JobMatchAnalysisInputSchema>;
export type JobMatchAnalysisOutput = z.infer<
  typeof JobMatchAnalysisOutputSchema
>;
