import type { ResumeCertification, ResumeEducation } from "@/features/resume/schema";

export interface MatchInput {
  title: string;
  location: string | null;
  remote: boolean;
  skills: string[];
}

export interface MatchDimension {
  label: string;
  available: boolean;
  /** 0-100, only meaningful when `available` is true. */
  score: number;
  detail: string;
}

export interface MatchBreakdown {
  /** 0-100, or null if no dimension had enough data to score at all —
   * never a fabricated fallback number. */
  score: number | null;
  dimensions: MatchDimension[];
  matchedSkills: string[];
  missingSkills: string[];
}

export interface ResumeMatchProfile {
  skills: string[];
  /** Most recent role title, if any experience entries exist. */
  currentTitle: string | null;
  location: string | null;
  /** Sprint 4 (Career Brain — Resume Intelligence). Additive fields from
   * the same already-parsed resume `getResumeMatchProfile` builds this
   * from — no new query or parse. `computeMatch` below never reads
   * these; they exist purely for Resume Intelligence to reuse this one
   * parse instead of re-parsing the resume a second time. */
  education: ResumeEducation[];
  certifications: ResumeCertification[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function titleOverlapScore(resumeTitle: string, opportunityTitle: string): number {
  const resumeWords = new Set(
    normalize(resumeTitle)
      .split(/\W+/)
      .filter((word) => word.length > 2),
  );
  const opportunityWords = normalize(opportunityTitle)
    .split(/\W+/)
    .filter((word) => word.length > 2);

  if (resumeWords.size === 0 || opportunityWords.length === 0) return 0;

  const matches = opportunityWords.filter((word) => resumeWords.has(word));
  return Math.round((matches.length / opportunityWords.length) * 100);
}

/**
 * Deterministic, explainable match score — not an AI call. Used for every
 * card in a search-results list, where calling the AI Router once per
 * card would mean N slow (observed: seconds to minutes) model calls just
 * to render a list. The AI-powered deep analysis
 * (`getOpportunityMatchAnalysisAction`, reusing the real
 * `analyzeJobMatch` Career Intelligence service) is reserved for the
 * Application Workspace page, where a user has committed to one specific
 * opportunity and a single on-demand call is reasonable.
 *
 * Every dimension degrades honestly: if a provider doesn't report skills
 * (Adzuna, Jooble today), that dimension is marked `available: false`
 * instead of silently scoring it 0 — the overall score is an average of
 * only the dimensions that actually had data, and the UI must say which
 * ones were skipped and why (see `MatchDimension.available`).
 */
export function computeMatch(
  opportunity: MatchInput,
  resume: ResumeMatchProfile | null,
): MatchBreakdown {
  if (!resume) {
    return {
      score: null,
      dimensions: [
        {
          label: "Resume",
          available: false,
          score: 0,
          detail: "Upload and parse a resume to see a match score.",
        },
      ],
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const dimensions: MatchDimension[] = [];

  const resumeSkillSet = new Set(resume.skills.map(normalize));
  const opportunitySkills = opportunity.skills;
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  if (opportunitySkills.length > 0) {
    matchedSkills = opportunitySkills.filter((skill) =>
      resumeSkillSet.has(normalize(skill)),
    );
    missingSkills = opportunitySkills.filter(
      (skill) => !resumeSkillSet.has(normalize(skill)),
    );
    const skillScore = Math.round(
      (matchedSkills.length / opportunitySkills.length) * 100,
    );
    dimensions.push({
      label: "Skills",
      available: true,
      score: skillScore,
      detail: `${matchedSkills.length} of ${opportunitySkills.length} listed skills match your resume.`,
    });
  } else {
    dimensions.push({
      label: "Skills",
      available: false,
      score: 0,
      detail: "This listing doesn't specify required skills.",
    });
  }

  if (resume.currentTitle) {
    const score = titleOverlapScore(resume.currentTitle, opportunity.title);
    dimensions.push({
      label: "Role match",
      available: true,
      score,
      detail:
        score > 0
          ? `The role title overlaps with your most recent title (${resume.currentTitle}).`
          : `The role title doesn't closely match your most recent title (${resume.currentTitle}).`,
    });
  } else {
    dimensions.push({
      label: "Role match",
      available: false,
      score: 0,
      detail: "No work experience on your resume to compare titles against.",
    });
  }

  if (opportunity.remote) {
    dimensions.push({
      label: "Location",
      available: true,
      score: 100,
      detail: "This opportunity is remote.",
    });
  } else if (resume.location && opportunity.location) {
    const score = normalize(opportunity.location).includes(
      normalize(resume.location),
    )
      ? 100
      : 30;
    dimensions.push({
      label: "Location",
      available: true,
      score,
      detail:
        score === 100
          ? `Location matches your profile (${resume.location}).`
          : `Location (${opportunity.location}) differs from your profile (${resume.location}).`,
    });
  } else {
    dimensions.push({
      label: "Location",
      available: false,
      score: 0,
      detail: "Not enough location information to compare.",
    });
  }

  const availableDimensions = dimensions.filter((dim) => dim.available);
  const score =
    availableDimensions.length === 0
      ? null
      : Math.round(
          availableDimensions.reduce((sum, dim) => sum + dim.score, 0) /
            availableDimensions.length,
        );

  return { score, dimensions, matchedSkills, missingSkills };
}
