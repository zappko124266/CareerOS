import type { z } from "zod";

import type {
  ResumeKeywordAnalysisInputSchema,
  ResumeKeywordAnalysisOutputSchema,
} from "./schema";

export type ResumeKeywordAnalysisInput = z.infer<
  typeof ResumeKeywordAnalysisInputSchema
>;
export type ResumeKeywordAnalysisOutput = z.infer<
  typeof ResumeKeywordAnalysisOutputSchema
>;
