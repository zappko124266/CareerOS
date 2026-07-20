"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { improveLinkedInExperience } from "./service";
import type {
  LinkedInExperienceImprovementInput,
  LinkedInExperienceImprovementOutput,
} from "./types";

export async function improveLinkedInExperienceAction(
  input: LinkedInExperienceImprovementInput,
): Promise<AnalysisActionResult<LinkedInExperienceImprovementOutput>> {
  return runAnalysisAction("linkedin.experience_improvement", () =>
    improveLinkedInExperience(input),
  );
}
