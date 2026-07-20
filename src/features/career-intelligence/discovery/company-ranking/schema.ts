import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const CompanyToRankSchema = z.object({
  companyName: z.string(),
  openRoles: z.number().int().min(0),
  sampleTitles: z.array(z.string()),
  sampleDescription: z.string(),
});

export const CompanyRankingInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  preferredRoles: z.array(z.string()),
  preferredIndustries: z.array(z.string()),
  companies: z.array(CompanyToRankSchema).min(1).max(20),
});

const factorSchema = z.object({
  score: scoreSchema,
  explanation: z.string(),
});

/** Same split as job-ranking: the AI scores the fuzzy, semantic factors;
 * deterministic ones (company preference, hiring-activity volume) are
 * computed in code and merged in — see `features/discovery/ranking.ts`. */
export const CompanyRankingResultSchema = z.object({
  companyName: z.string(),
  industryMatch: factorSchema,
  roleAlignment: factorSchema,
  recommendation: z.string(),
});

export const CompanyRankingOutputSchema = z.object({
  rankings: z.array(CompanyRankingResultSchema),
});
