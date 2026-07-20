import type { z } from "zod";

import type {
  BulletSuggestionSchema,
  ResumeTailoringInputSchema,
  ResumeTailoringOutputSchema,
  TailoringBulletInputSchema,
} from "./schema";

export type TailoringBulletInput = z.infer<typeof TailoringBulletInputSchema>;
export type ResumeTailoringInput = z.infer<typeof ResumeTailoringInputSchema>;
export type BulletSuggestion = z.infer<typeof BulletSuggestionSchema>;
export type ResumeTailoringOutput = z.infer<typeof ResumeTailoringOutputSchema>;
