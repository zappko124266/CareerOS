import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import {
  buildCareerProgressionPrompt,
  CAREER_PROGRESSION_SYSTEM_PROMPT,
} from "./prompt";
import {
  CareerProgressionInputSchema,
  CareerProgressionOutputSchema,
} from "./schema";
import type { CareerProgressionInput, CareerProgressionOutput } from "./types";

export const suggestCareerProgression = createAnalysisService<
  CareerProgressionInput,
  CareerProgressionOutput
>({
  name: "career.progression_suggestions",
  inputSchema: CareerProgressionInputSchema,
  outputSchema: CareerProgressionOutputSchema,
  systemPrompt: CAREER_PROGRESSION_SYSTEM_PROMPT,
  buildPrompt: buildCareerProgressionPrompt,
});
