import type { z } from "zod";

import type {
  ExperienceImprovementSchema,
  LinkedInExperienceImprovementInputSchema,
  LinkedInExperienceImprovementOutputSchema,
} from "./schema";

export type LinkedInExperienceImprovementInput = z.infer<
  typeof LinkedInExperienceImprovementInputSchema
>;
export type LinkedInExperienceImprovementOutput = z.infer<
  typeof LinkedInExperienceImprovementOutputSchema
>;
export type ExperienceImprovement = z.infer<typeof ExperienceImprovementSchema>;
