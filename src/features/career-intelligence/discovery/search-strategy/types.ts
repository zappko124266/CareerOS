import type { z } from "zod";

import type {
  AiSearchStrategyInputSchema,
  AiSearchStrategyOutputSchema,
  SearchQuerySchema,
} from "./schema";

export type AiSearchStrategyInput = z.infer<typeof AiSearchStrategyInputSchema>;
export type AiSearchStrategyOutput = z.infer<typeof AiSearchStrategyOutputSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
