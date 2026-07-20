import type { z } from "zod";

import type {
  CompanyMatchAnalysisInputSchema,
  CompanyMatchAnalysisOutputSchema,
} from "./schema";

export type CompanyMatchAnalysisInput = z.infer<
  typeof CompanyMatchAnalysisInputSchema
>;
export type CompanyMatchAnalysisOutput = z.infer<
  typeof CompanyMatchAnalysisOutputSchema
>;
