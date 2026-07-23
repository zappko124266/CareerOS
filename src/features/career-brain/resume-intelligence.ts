import { DIMENSION_LABEL } from "@/components/resume/ats-score-panel";
import { AtsScoreBreakdownSchema } from "@/features/resume/schema";
import type { ResumeCertification, ResumeEducation } from "@/features/resume/schema";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import type { ResumeAnalysis } from "@/generated/prisma/client";

import type { ResumeIntelligence } from "./types";

const STRONG_THRESHOLD = 70;

/**
 * Resume Intelligence builder. Strengths/weaknesses reuse the existing
 * ATS breakdown dimensions (`AtsScoreBreakdownSchema`/`DIMENSION_LABEL`,
 * `features/dashboard/briefing.ts` already imports the same label map
 * for this exact reason) rather than a new scoring model.
 * `experienceQuality` reuses the two ATS dimensions that are literally
 * about how well experience is written (`impactLanguage`,
 * `quantifiedAchievements`) rather than inventing a new metric.
 * `missingSkills` reuses the same saved-opportunity Priority Queue rows
 * `getCareerBrain` already computed for Recommended Opportunities/Skill
 * Intelligence — no second match computation.
 */
export function buildResumeIntelligence(input: {
  resumeCount: number;
  latestAnalysis: ResumeAnalysis | null;
  education: ResumeEducation[];
  certifications: ResumeCertification[];
  priorityQueueRows: PriorityQueueRow[];
}): ResumeIntelligence {
  const { resumeCount, latestAnalysis, education, certifications, priorityQueueRows } = input;

  const missingSkillFrequency = new Map<string, number>();
  for (const row of priorityQueueRows) {
    for (const skill of row.intelligence.match.missingSkills) {
      missingSkillFrequency.set(skill, (missingSkillFrequency.get(skill) ?? 0) + 1);
    }
  }
  const missingSkills = Array.from(missingSkillFrequency.keys());

  if (!latestAnalysis) {
    return {
      hasResume: resumeCount > 0,
      overallScore: null,
      strengths: [],
      weaknesses: [],
      missingSkills,
      certifications,
      education,
      experienceQuality: {
        score: null,
        explanation: "Run an ATS analysis to see how well your experience is described.",
      },
    };
  }

  const breakdown = AtsScoreBreakdownSchema.safeParse(latestAnalysis.breakdown);
  const dimensions = breakdown.success
    ? (Object.entries(breakdown.data) as [keyof typeof breakdown.data, number][])
    : [];

  const strengths = dimensions
    .filter(([, score]) => score >= STRONG_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => DIMENSION_LABEL[key]);

  const weaknesses = dimensions
    .filter(([, score]) => score < STRONG_THRESHOLD)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => DIMENSION_LABEL[key]);

  const experienceQuality = breakdown.success
    ? {
        score: Math.round((breakdown.data.impactLanguage + breakdown.data.quantifiedAchievements) / 2),
        explanation:
          "Based on how well your experience bullets use impact language and quantified achievements.",
      }
    : { score: null, explanation: "Run an ATS analysis to see how well your experience is described." };

  return {
    hasResume: resumeCount > 0,
    overallScore: latestAnalysis.overallScore,
    strengths,
    weaknesses,
    missingSkills,
    certifications,
    education,
    experienceQuality,
  };
}
