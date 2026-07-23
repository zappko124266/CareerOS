import type { CareerHealthFactor, CareerHealthResultV2 } from "@/features/career/types";

import type { CareerHealthSummary } from "./types";

type FactorKey = keyof Omit<CareerHealthResultV2, "overallScore">;

const FACTOR_LABEL: Record<FactorKey, string> = {
  interviewReadiness: "Interview readiness",
  resumeQuality: "Resume quality",
  linkedinQuality: "LinkedIn quality",
  skillReadiness: "Skill readiness",
  marketReadiness: "Market readiness",
  companyReadiness: "Company readiness",
  growthReadiness: "Growth readiness",
};

type ScoredFactor = [FactorKey, { score: number; explanation: string }];

/**
 * The Career Health Summary — Sprint 3 rule 4: a human-readable
 * assessment that leads with a sentence, not a percentage.
 * `computeCareerHealthV2` (`features/career/health.ts`) is reused
 * wholesale and unchanged — this only reframes its 7 factors into
 * strengths/blockers, reusing each factor's own already-human-written
 * `explanation` string rather than inventing new copy. `overallScore` is
 * still returned, but only for secondary/small display — never the
 * headline.
 */
export function buildCareerHealthSummary(health: CareerHealthResultV2 | null): CareerHealthSummary {
  if (!health) {
    return {
      headline: "Upload a resume or start applying to unlock your Career Health assessment.",
      strengths: [],
      blockers: [],
      overallScore: null,
    };
  }

  const entries = (Object.entries(health) as [string, CareerHealthFactor][]).filter(
    ([key]) => key !== "overallScore",
  ) as [FactorKey, CareerHealthFactor][];

  const available = entries.filter((entry): entry is ScoredFactor => entry[1].score !== null);
  const unavailable = entries.filter((entry) => entry[1].score === null);

  const byScoreDesc = [...available].sort((a, b) => b[1].score - a[1].score);
  const byScoreAsc = [...available].sort((a, b) => a[1].score - b[1].score);

  const strengths = byScoreDesc
    .filter(([, factor]) => factor.score >= 60)
    .slice(0, 2)
    .map(([, factor]) => factor.explanation);

  // Blockers prioritize factors with no data yet (a real, actionable gap
  // to unlock) over merely low-scoring ones — both are real, but
  // "you haven't done this yet" is more actionable than "you did this
  // and scored low."
  const blockerEntries = unavailable.length > 0 ? unavailable : byScoreAsc.filter(([, f]) => f.score < 60);
  const blockers = blockerEntries.slice(0, 2).map(([, factor]) => factor.explanation);

  const topStrengthKey = byScoreDesc[0]?.[0];
  const topBlockerKey = blockerEntries[0]?.[0];

  const headline =
    topStrengthKey && topBlockerKey
      ? `${FACTOR_LABEL[topStrengthKey]} is a real strength — ${FACTOR_LABEL[topBlockerKey].toLowerCase()} is your biggest gap right now.`
      : topBlockerKey
        ? `${FACTOR_LABEL[topBlockerKey]} is your biggest gap right now.`
        : "Your career health is strong across every factor CareerOS can measure.";

  return { headline, strengths, blockers, overallScore: health.overallScore };
}
