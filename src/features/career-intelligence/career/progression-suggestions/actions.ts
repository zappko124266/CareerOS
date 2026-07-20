"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { suggestCareerProgression } from "./service";
import type { CareerProgressionInput, CareerProgressionOutput } from "./types";

export async function suggestCareerProgressionAction(
  input: CareerProgressionInput,
): Promise<AnalysisActionResult<CareerProgressionOutput>> {
  return runAnalysisAction("career.progression_suggestions", () =>
    suggestCareerProgression(input),
  );
}
