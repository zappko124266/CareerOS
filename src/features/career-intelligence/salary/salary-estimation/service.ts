import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildSalaryEstimationPrompt,
  SALARY_ESTIMATION_SYSTEM_PROMPT,
} from "./prompt";
import {
  SalaryEstimationInputSchema,
  SalaryEstimationOutputSchema,
} from "./schema";
import type { SalaryEstimationInput, SalaryEstimationOutput } from "./types";

export const estimateSalary = createAnalysisService<
  SalaryEstimationInput,
  SalaryEstimationOutput
>({
  name: "salary.salary_estimation",
  inputSchema: SalaryEstimationInputSchema,
  outputSchema: SalaryEstimationOutputSchema,
  systemPrompt: SALARY_ESTIMATION_SYSTEM_PROMPT,
  buildPrompt: buildSalaryEstimationPrompt,
});
