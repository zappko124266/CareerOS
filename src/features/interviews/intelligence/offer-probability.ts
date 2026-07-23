import { INTERVIEW_STAGE_ORDER } from "@/features/interviews/types";
import type { InterviewStage } from "@/features/interviews/types";

/**
 * The Offer Probability Engine — Sprint 20, Module 10. "Deterministic
 * first. AI only when required": every factor here is a weighted
 * average over real, already-computed signals — no AI call. A factor is
 * excluded from the average (not defaulted to 0) when its underlying
 * signal doesn't exist yet, the same `available: boolean` discipline
 * `compareOffers` (`features/interviews/service.ts`) already established
 * for offer-comparison factors.
 */
export interface OfferProbabilityFactor {
  label: string;
  score: number;
  available: boolean;
  explanation: string;
}

export interface OfferProbabilityResult {
  probability: number;
  factors: OfferProbabilityFactor[];
}

const STAGE_WEIGHT = 0.35;
const MATCH_WEIGHT = 0.2;
const COMPANY_WEIGHT = 0.15;
const FEEDBACK_WEIGHT = 0.2;
const DELAY_WEIGHT = 0.1;

function stageProgressScore(stage: InterviewStage): number {
  if (stage === "REJECTED" || stage === "WITHDRAWN") return 0;
  if (stage === "ACCEPTED") return 100;
  const index = INTERVIEW_STAGE_ORDER.indexOf(stage);
  if (index < 0) return 0;
  return Math.round((index / (INTERVIEW_STAGE_ORDER.length - 1)) * 100);
}

function delayScore(daysWaiting: number): number {
  if (daysWaiting <= 3) return 100;
  if (daysWaiting <= 7) return 70;
  if (daysWaiting <= 14) return 40;
  return 15;
}

export function estimateOfferProbability(input: {
  stage: InterviewStage;
  matchScore: number | null;
  hasCompanyIntelligence: boolean;
  feedbackAnalysis: { strengths: string[]; weaknesses: string[] } | null;
  daysWaiting: number;
  historicalOfferRate: number | null;
}): OfferProbabilityResult {
  if (input.stage === "REJECTED" || input.stage === "WITHDRAWN") {
    return {
      probability: 0,
      factors: [
        {
          label: "Outcome",
          score: 0,
          available: true,
          explanation: input.stage === "REJECTED" ? "This opportunity was rejected." : "This application was withdrawn.",
        },
      ],
    };
  }
  if (input.stage === "ACCEPTED") {
    return {
      probability: 100,
      factors: [{ label: "Outcome", score: 100, available: true, explanation: "Offer already accepted." }],
    };
  }

  const factors: OfferProbabilityFactor[] = [
    {
      label: "Interview progress",
      score: stageProgressScore(input.stage),
      available: true,
      explanation: `Currently at the ${input.stage} stage.`,
    },
    {
      label: "Resume/role match",
      score: input.matchScore ?? 0,
      available: input.matchScore !== null,
      explanation: input.matchScore !== null ? `Opportunity match score: ${input.matchScore}/100.` : "No match score computed yet.",
    },
    {
      label: "Company research depth",
      score: input.hasCompanyIntelligence ? 70 : 0,
      available: input.hasCompanyIntelligence,
      explanation: input.hasCompanyIntelligence
        ? "Company intelligence generated — decision context available."
        : "No company research generated yet.",
    },
    {
      label: "Interview feedback",
      score: input.feedbackAnalysis
        ? Math.round(
            (input.feedbackAnalysis.strengths.length /
              Math.max(1, input.feedbackAnalysis.strengths.length + input.feedbackAnalysis.weaknesses.length)) *
              100,
          )
        : 0,
      available: input.feedbackAnalysis !== null,
      explanation: input.feedbackAnalysis
        ? `${input.feedbackAnalysis.strengths.length} strength(s) vs ${input.feedbackAnalysis.weaknesses.length} weakness(es) noted.`
        : "No post-interview feedback recorded yet.",
    },
    {
      label: "Response delay",
      score: delayScore(input.daysWaiting),
      available: true,
      explanation: `${input.daysWaiting} day(s) since the last stage change.`,
    },
    {
      label: "Historical offer rate",
      score: input.historicalOfferRate ?? 0,
      available: input.historicalOfferRate !== null,
      explanation:
        input.historicalOfferRate !== null
          ? `You've received offers on ${input.historicalOfferRate}% of past applications.`
          : "Not enough application history yet.",
    },
  ];

  const weights: Record<string, number> = {
    "Interview progress": STAGE_WEIGHT,
    "Resume/role match": MATCH_WEIGHT,
    "Company research depth": COMPANY_WEIGHT,
    "Interview feedback": FEEDBACK_WEIGHT,
    "Response delay": DELAY_WEIGHT,
    "Historical offer rate": 0.1,
  };

  const availableFactors = factors.filter((factor) => factor.available);
  const totalWeight = availableFactors.reduce((sum, factor) => sum + (weights[factor.label] ?? 0), 0);
  const probability = totalWeight > 0
    ? Math.round(
        availableFactors.reduce((sum, factor) => sum + factor.score * (weights[factor.label] ?? 0), 0) / totalWeight,
      )
    : stageProgressScore(input.stage);

  return { probability, factors };
}
