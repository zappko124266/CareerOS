import type { z } from "zod";

import type {
  HeadlineOptimizationInputSchema,
  HeadlineOptimizationOutputSchema,
} from "./schema";

export type HeadlineOptimizationInput = z.infer<
  typeof HeadlineOptimizationInputSchema
>;
export type HeadlineOptimizationOutput = z.infer<
  typeof HeadlineOptimizationOutputSchema
>;
