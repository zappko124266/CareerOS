import type { z } from "zod";

import type {
  AtsIssueSchema,
  ResumeAtsAnalysisInputSchema,
  ResumeAtsAnalysisOutputSchema,
} from "./schema";

export type ResumeAtsAnalysisInput = z.infer<
  typeof ResumeAtsAnalysisInputSchema
>;
export type ResumeAtsAnalysisOutput = z.infer<
  typeof ResumeAtsAnalysisOutputSchema
>;
export type AtsIssue = z.infer<typeof AtsIssueSchema>;
