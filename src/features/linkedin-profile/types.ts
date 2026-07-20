import type { z } from "zod";

import type { LinkedInProfileInputSchema } from "./schema";

export type LinkedInProfileInput = z.infer<typeof LinkedInProfileInputSchema>;

/** One entry per common LinkedIn profile section this codebase knows how
 * to check for — see `detectMissingLinkedInSections` in `service.ts`. */
export const LINKEDIN_SECTION_KEYWORDS = [
  "About",
  "Experience",
  "Education",
  "Skills",
  "Certifications",
  "Featured",
  "Projects",
] as const;
