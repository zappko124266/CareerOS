import type { AvailabilityWindow } from "@/features/discovery/types";

import { computeMatch, type MatchBreakdown, type MatchInput, type ResumeMatchProfile } from "./match";
import { RECOMMENDATION_TIER_LABEL, type RecommendationTier } from "./types";

export interface OpportunityIntelligenceContext {
  /** Lowercased `preference.preferredCompanies` — built once by the caller
   * and reused across every opportunity, not recomputed per row. */
  dreamCompanyNames: Set<string>;
  urgency: AvailabilityWindow | null;
}

export interface OpportunityIntelligence {
  /** `null` only when `match.score` is null (no parsed resume yet) —
   * never a fabricated tier. */
  tier: RecommendationTier | null;
  tierLabel: string;
  /** Deterministic one-line "why" — built from the match breakdown
   * already computed below, never an AI call. */
  reasoning: string;
  match: MatchBreakdown;
  isDreamCompany: boolean;
}

/** Same 4-bucket vocabulary the AI-powered Job Match Analysis already
 * uses (`RECOMMENDATION_TIERS`) — thresholds are a deterministic proxy
 * for the same judgment, not a new taxonomy. */
function deriveTier(score: number | null): RecommendationTier | null {
  if (score === null) return null;
  if (score >= 80) return "strong_match";
  if (score >= 60) return "good_match";
  if (score >= 40) return "stretch";
  return "not_a_match";
}

function buildReasoning(
  match: MatchBreakdown,
  isDreamCompany: boolean,
  urgency: AvailabilityWindow | null,
): string {
  if (match.score === null) {
    return "Upload and parse a resume to see how well this opportunity fits.";
  }

  const parts: string[] = [];

  const topDimension = [...match.dimensions]
    .filter((dimension) => dimension.available)
    .sort((a, b) => b.score - a.score)[0];
  if (topDimension) parts.push(topDimension.detail);

  if (match.missingSkills.length > 0) {
    parts.push(
      `${match.missingSkills.length} listed skill${match.missingSkills.length === 1 ? "" : "s"} to build.`,
    );
  } else if (match.matchedSkills.length > 0) {
    parts.push("You already have every listed skill.");
  }

  if (isDreamCompany) parts.push("This is one of your dream companies.");
  if (urgency === "IMMEDIATE" || urgency === "TWO_WEEKS") {
    parts.push("Worth prioritizing given your availability.");
  }

  return parts.join(" ");
}

/**
 * Sprint 2 — the single Opportunity Intelligence Engine. Composes,
 * rather than duplicates: `computeMatch` (score, dimensions, matched and
 * missing skills — already the shared deterministic scorer) plus
 * onboarding context (dream companies, urgency) the caller has already
 * fetched via `getDiscoveryPreference`. Pure and synchronous — no DB or
 * AI calls of its own, so it's exactly as cheap to call once per row in
 * a list as `computeMatch` already is (zero N+1: callers supply one
 * shared `ResumeMatchProfile` and one shared `OpportunityIntelligenceContext`
 * for every opportunity).
 */
export function buildOpportunityIntelligence(
  opportunity: MatchInput & { companyName: string },
  resume: ResumeMatchProfile | null,
  context: OpportunityIntelligenceContext,
): OpportunityIntelligence {
  const match = computeMatch(opportunity, resume);
  const tier = deriveTier(match.score);
  const isDreamCompany = context.dreamCompanyNames.has(opportunity.companyName.toLowerCase());

  return {
    tier,
    tierLabel: tier ? RECOMMENDATION_TIER_LABEL[tier] : "Add a resume",
    reasoning: buildReasoning(match, isDreamCompany, context.urgency),
    match,
    isDreamCompany,
  };
}
