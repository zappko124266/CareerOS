import type { z } from "zod";

import type {
  JobRankingInputSchema,
  JobRankingOutputSchema,
  JobRankingResultSchema,
  JobToRankSchema,
} from "./schema";

export type JobToRank = z.infer<typeof JobToRankSchema>;
export type JobRankingInput = z.infer<typeof JobRankingInputSchema>;
export type JobRankingResult = z.infer<typeof JobRankingResultSchema>;
export type JobRankingOutput = z.infer<typeof JobRankingOutputSchema>;
