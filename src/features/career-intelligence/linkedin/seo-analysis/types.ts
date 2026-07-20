import type { z } from "zod";

import type {
  KeywordCoverageSchema,
  LinkedInSeoAnalysisInputSchema,
  LinkedInSeoAnalysisOutputSchema,
} from "./schema";

export type LinkedInSeoAnalysisInput = z.infer<
  typeof LinkedInSeoAnalysisInputSchema
>;
export type LinkedInSeoAnalysisOutput = z.infer<
  typeof LinkedInSeoAnalysisOutputSchema
>;
export type KeywordCoverage = z.infer<typeof KeywordCoverageSchema>;
