import type { z } from "zod";

import type {
  SalaryEstimationInputSchema,
  SalaryEstimationOutputSchema,
} from "./schema";

export type SalaryEstimationInput = z.infer<typeof SalaryEstimationInputSchema>;
export type SalaryEstimationOutput = z.infer<
  typeof SalaryEstimationOutputSchema
>;
