import { z } from "zod";

import {
  scoreSchema,
  severityLevelSchema,
} from "@/features/career-intelligence/analysis/schema";

export const ResumeAtsAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
  targetJobDescription: z.string().optional(),
});

export const AtsIssueSchema = z.object({
  section: z.string(),
  severity: severityLevelSchema,
  issue: z.string(),
  fix: z.string(),
});

export const ResumeAtsAnalysisOutputSchema = z.object({
  atsScore: scoreSchema,
  breakdown: z.object({
    keywordMatch: scoreSchema,
    formatting: scoreSchema,
    sectionCompleteness: scoreSchema,
    parseability: scoreSchema,
  }),
  issues: z.array(AtsIssueSchema),
});
