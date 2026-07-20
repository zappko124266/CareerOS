import type { z } from "zod";

import type {
  AboutOptimizationInputSchema,
  AboutOptimizationOutputSchema,
} from "./schema";

export type AboutOptimizationInput = z.infer<
  typeof AboutOptimizationInputSchema
>;
export type AboutOptimizationOutput = z.infer<
  typeof AboutOptimizationOutputSchema
>;
