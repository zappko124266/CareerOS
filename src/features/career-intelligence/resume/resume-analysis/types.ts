import type { z } from "zod";

import type {
  ResumeAnalysisInputSchema,
  ResumeAnalysisOutputSchema,
} from "./schema";

export type ResumeAnalysisInput = z.infer<typeof ResumeAnalysisInputSchema>;
export type ResumeAnalysisOutput = z.infer<typeof ResumeAnalysisOutputSchema>;
