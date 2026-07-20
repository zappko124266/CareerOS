"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { estimateSalary } from "./service";
import type { SalaryEstimationInput, SalaryEstimationOutput } from "./types";

export async function estimateSalaryAction(
  input: SalaryEstimationInput,
): Promise<AnalysisActionResult<SalaryEstimationOutput>> {
  return runAnalysisAction("salary.salary_estimation", () =>
    estimateSalary(input),
  );
}
