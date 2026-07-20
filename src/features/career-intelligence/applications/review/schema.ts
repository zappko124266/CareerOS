import { z } from "zod";

import { scoreSchema } from "@/features/career-intelligence/analysis/schema";

export const ApplicationReviewInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  jobDescription: z.string().min(1, "jobDescription is required"),
  companyName: z.string().min(1, "companyName is required"),
  roleTitle: z.string().min(1, "roleTitle is required"),
  /** Omitted entirely (not empty-string) when no cover letter/email exists
   * yet — `reviewApplication` in `service.ts` decides availability from
   * this, not from anything the model reports. */
  coverLetterContent: z.string().optional(),
  emailContent: z.string().optional(),
});

const findingSchema = z.object({
  point: z.string(),
  why: z.string(),
});

const factorSchema = z.object({
  score: scoreSchema,
  explanation: z.string(),
});

export const ApplicationReviewOutputSchema = z.object({
  strengths: z.array(findingSchema),
  weaknesses: z.array(findingSchema),
  missingKeywords: z.array(z.string()),
  missingSkills: z.array(
    z.object({ skill: z.string(), why: z.string() }),
  ),
  suggestions: z.array(findingSchema),
  recruiterPerspective: z.string(),
  atsPerspective: z.string(),
  factors: z.object({
    resumeQuality: factorSchema,
    jobMatch: factorSchema,
    coverLetterQuality: factorSchema,
    emailQuality: factorSchema,
    keywordCoverage: factorSchema,
    requiredSkillsCoverage: factorSchema,
  }),
});
