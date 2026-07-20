import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildLinkedInExperienceImprovementPrompt,
  LINKEDIN_EXPERIENCE_IMPROVEMENT_SYSTEM_PROMPT,
} from "./prompt";
import {
  LinkedInExperienceImprovementInputSchema,
  LinkedInExperienceImprovementOutputSchema,
} from "./schema";
import type {
  LinkedInExperienceImprovementInput,
  LinkedInExperienceImprovementOutput,
} from "./types";

export const improveLinkedInExperience = createAnalysisService<
  LinkedInExperienceImprovementInput,
  LinkedInExperienceImprovementOutput
>({
  name: "linkedin.experience_improvement",
  inputSchema: LinkedInExperienceImprovementInputSchema,
  outputSchema: LinkedInExperienceImprovementOutputSchema,
  systemPrompt: LINKEDIN_EXPERIENCE_IMPROVEMENT_SYSTEM_PROMPT,
  buildPrompt: buildLinkedInExperienceImprovementPrompt,
});
