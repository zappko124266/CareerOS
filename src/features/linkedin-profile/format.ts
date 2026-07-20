import type { LinkedInAnalysis } from "@/generated/prisma/client";
import type {
  AboutOptimizationOutput,
  ExperienceImprovement,
  KeywordCoverage,
} from "@/features/career-intelligence/linkedin";

export interface LinkedInAnalysisOutput {
  id: string;
  createdAt: Date;
  /** `null` when that slice of the analysis failed (a real AI Router
   * failure, e.g. a provider timeout) — never a fabricated 0. See
   * `analyzeLinkedInProfile`'s doc comment for why this can happen. */
  seoScore: number | null;
  recruiterVisibilityScore: number | null;
  keywordCoverage: KeywordCoverage[];
  missingKeywords: string[];
  missingSections: string[];
  headlineSuggestions: string[];
  aboutSuggestions: AboutOptimizationOutput | null;
  experienceImprovements: ExperienceImprovement[];
}

/** Reshapes a persisted `LinkedInAnalysis` row back into the typed shape
 * `analyzeLinkedInProfile` returns right after generating one — same
 * freshly-generated/loaded-from-DB parity convention as
 * `toExperienceGapAssessmentOutput`. */
export function toLinkedInAnalysisOutput(row: LinkedInAnalysis): LinkedInAnalysisOutput {
  return {
    id: row.id,
    createdAt: row.createdAt,
    seoScore: row.seoScore,
    recruiterVisibilityScore: row.recruiterVisibilityScore,
    keywordCoverage: row.keywordCoverage as unknown as KeywordCoverage[],
    missingKeywords: row.missingKeywords as unknown as string[],
    missingSections: row.missingSections as unknown as string[],
    headlineSuggestions: row.headlineSuggestions as unknown as string[],
    aboutSuggestions: row.aboutSuggestions as unknown as AboutOptimizationOutput | null,
    experienceImprovements: row.experienceImprovements as unknown as ExperienceImprovement[],
  };
}
