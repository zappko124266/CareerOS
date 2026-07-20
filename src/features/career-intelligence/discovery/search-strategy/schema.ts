import { z } from "zod";

export const AiSearchStrategyInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  preferredRoles: z.array(z.string()),
  preferredIndustries: z.array(z.string()),
  preferredCompanies: z.array(z.string()),
  locationSummary: z.string(),
  salarySummary: z.string().optional(),
  workTypeSummary: z.string(),
  experienceLevel: z.string().optional(),
  availability: z.string().optional(),
});

export const SearchQuerySchema = z.object({
  query: z.string(),
  reasoning: z.string(),
});

export const AiSearchStrategyOutputSchema = z.object({
  searchQueries: z.array(SearchQuerySchema).min(1).max(8),
  targetRoles: z.array(z.string()),
  targetIndustries: z.array(z.string()),
  strategySummary: z.string(),
});
