import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const JobToRankSchema = z.object({
  sourceId: z.string(),
  title: z.string(),
  companyName: z.string(),
  location: z.string().nullable(),
  description: z.string(),
});

export const JobRankingInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  preferredRoles: z.array(z.string()),
  preferredIndustries: z.array(z.string()),
  experienceLevel: z.string().optional(),
  jobs: z.array(JobToRankSchema).min(1).max(20),
});

const factorSchema = z.object({
  score: scoreSchema,
  explanation: z.string(),
});

/** The AI only scores the genuinely fuzzy, semantic-understanding factors
 * (resume/skills/experience/industry fit). Deterministic factors
 * (location, salary, company preference, recent hiring activity) are
 * computed in code by `features/discovery/ranking.ts` and merged in — see
 * that file's doc comment for why. */
export const JobRankingResultSchema = z.object({
  sourceId: z.string(),
  resumeMatch: factorSchema,
  skillsMatch: factorSchema,
  experienceMatch: factorSchema,
  industryMatch: factorSchema,
  recommendation: z.string(),
});

export const JobRankingOutputSchema = z.object({
  rankings: z.array(JobRankingResultSchema),
});
