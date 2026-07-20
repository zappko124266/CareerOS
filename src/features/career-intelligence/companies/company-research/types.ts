import type { z } from "zod";

import type {
  CompanyResearchInputSchema,
  CompanyResearchOutputSchema,
} from "./schema";

export type CompanyResearchInput = z.infer<typeof CompanyResearchInputSchema>;
export type CompanyResearchOutput = z.infer<typeof CompanyResearchOutputSchema>;
