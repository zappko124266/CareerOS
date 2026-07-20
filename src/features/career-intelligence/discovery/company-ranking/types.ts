import type { z } from "zod";

import type {
  CompanyRankingInputSchema,
  CompanyRankingOutputSchema,
  CompanyRankingResultSchema,
  CompanyToRankSchema,
} from "./schema";

export type CompanyToRank = z.infer<typeof CompanyToRankSchema>;
export type CompanyRankingInput = z.infer<typeof CompanyRankingInputSchema>;
export type CompanyRankingResult = z.infer<typeof CompanyRankingResultSchema>;
export type CompanyRankingOutput = z.infer<typeof CompanyRankingOutputSchema>;
