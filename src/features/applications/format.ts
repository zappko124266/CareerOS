import type {
  ApplicationDocument,
  ApplicationReview,
  ApplicationStrategy,
  ExperienceGapAssessment,
} from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";
import type { ExperienceGapAnalysisOutput } from "@/features/career-intelligence/skills";
import {
  STRATEGY_FACTOR_KEYS,
  type StrategyFactorKey,
  type StrategyFactors,
} from "@/features/career-intelligence/applications/strategy/types";

/** Prepends the subject line to the exported body for EMAIL documents —
 * the plain PDF/DOCX exporters only render one text body, so this is the
 * one place both export routes get a subject line included without
 * duplicating the "only for EMAIL, only if set" check. */
export function buildExportBody(document: ApplicationDocument): string {
  if (document.kind === "EMAIL" && document.subjectLine) {
    return `Subject: ${document.subjectLine}\n\n${document.content}`;
  }
  return document.content;
}

/** `ApplicationReview`'s Json columns come back from Prisma as
 * `Prisma.JsonValue` — this re-shapes one DB row into the same rich,
 * typed shape `runApplicationReview` returns right after generating it, so
 * the UI (`ApplicationReviewPanel`, `ApplicationPackagePanel`) can treat a
 * freshly-generated review and one loaded from the database identically. */
export function toReviewOutput(
  row: ApplicationReview,
): ApplicationReviewOutput & { id: string; createdAt: Date } {
  return {
    id: row.id,
    createdAt: row.createdAt,
    overallReadiness: row.readinessScore,
    factors: row.factors as unknown as ApplicationReviewOutput["factors"],
    strengths: row.strengths as unknown as ApplicationReviewOutput["strengths"],
    weaknesses: row.weaknesses as unknown as ApplicationReviewOutput["weaknesses"],
    missingKeywords: row.missingKeywords as unknown as ApplicationReviewOutput["missingKeywords"],
    missingSkills: row.missingSkills as unknown as ApplicationReviewOutput["missingSkills"],
    suggestions: row.suggestions as unknown as ApplicationReviewOutput["suggestions"],
    recruiterPerspective: row.recruiterPerspective,
    atsPerspective: row.atsPerspective,
  };
}

export interface ApplicationStrategyOutput {
  id: string;
  createdAt: Date;
  bestResumeId: string | null;
  /** Why this resume was selected over the user's other resumes — stored
   * as an extra `reasoning.bestResume` entry alongside the 9 per-factor
   * reasons rather than its own column, since it's the same kind of
   * "explain the WHY" text, just not tied to a true/false factor. */
  bestResumeReasoning: string;
  confidence: number;
  factors: StrategyFactors;
}

/** Reconstructs `StrategyFactors` from an `ApplicationStrategy` row — the
 * 9 boolean columns and the flat `reasoning` JSON are stored separately
 * (so each factor is its own indexable/queryable column), but the UI
 * always renders them together as one factor per key, same shape
 * `generateApplicationStrategy` returns right after generating one. */
export function toStrategyOutput(row: ApplicationStrategy): ApplicationStrategyOutput {
  const reasoning = row.reasoning as unknown as Record<string, string>;

  const factors = Object.fromEntries(
    STRATEGY_FACTOR_KEYS.map((key) => [
      key,
      { value: Boolean(row[key as keyof ApplicationStrategy]), reasoning: reasoning[key] ?? "" },
    ]),
  ) as StrategyFactors;

  return {
    id: row.id,
    createdAt: row.createdAt,
    bestResumeId: row.bestResumeId,
    bestResumeReasoning: reasoning.bestResume ?? "",
    confidence: row.confidence,
    factors,
  };
}

export const STRATEGY_FACTOR_ORDER: StrategyFactorKey[] = STRATEGY_FACTOR_KEYS as unknown as StrategyFactorKey[];

export type ExperienceGapAssessmentOutput = ExperienceGapAnalysisOutput & {
  id: string;
  createdAt: Date;
};

/** Reshapes a persisted `ExperienceGapAssessment` row back into the same
 * shape `analyzeExperienceGap` returns right after generating one — same
 * "freshly-generated and loaded-from-DB look identical to the UI"
 * convention as `toReviewOutput`. */
export function toExperienceGapAssessmentOutput(
  row: ExperienceGapAssessment,
): ExperienceGapAssessmentOutput {
  return {
    id: row.id,
    createdAt: row.createdAt,
    gaps: row.gaps as unknown as ExperienceGapAnalysisOutput["gaps"],
    overallReadiness: row.overallReadiness,
    mitigationSuggestions: row.mitigationSuggestions as unknown as ExperienceGapAnalysisOutput["mitigationSuggestions"],
  };
}
