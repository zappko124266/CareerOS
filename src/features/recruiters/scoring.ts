import type { RecruiterInteractionType } from "./types";

/**
 * Module 2/8 — Recruiter Relationship Intelligence & Relationship Health
 * Engine. Entirely deterministic, same "derive from real rows, never
 * fabricate" discipline as `interviews/intelligence/offer-probability.ts`
 * — no AI call. Every signal here traces back to a real
 * `RecruiterInteraction` row or a real connected `Interview`/
 * `Opportunity`; there is no "recruiter-initiated vs candidate-initiated"
 * factor because `RecruiterInteractionType` has no direction field to
 * read that from honestly (see the Sprint 21 report's "Remaining gaps").
 */
export interface RelationshipSignals {
  interactionCount: number;
  contactedCount: number;
  repliedCount: number;
  ghostedCount: number;
  interviewCount: number;
  hiredCount: number;
  offerOrAcceptedOpportunityCount: number;
  connectedOpportunityCount: number;
  mostRecentInteractionType: RecruiterInteractionType | null;
  daysSinceLastInteraction: number | null;
}

export interface RelationshipScoreFactor {
  label: string;
  contribution: number;
  explanation: string;
}

export interface RelationshipScoreResult {
  score: number;
  responseRate: number | null;
  factors: RelationshipScoreFactor[];
}

const MAX_REPLY_CONTRIBUTION = 24;
const MAX_HISTORY_CONTRIBUTION = 15;

export function computeRelationshipScore(signals: RelationshipSignals): RelationshipScoreResult {
  const factors: RelationshipScoreFactor[] = [];
  let score = 30;
  factors.push({ label: "Base", contribution: 30, explanation: "Starting point before real signals are applied." });

  const responseRate =
    signals.contactedCount > 0 ? Math.round((signals.repliedCount / signals.contactedCount) * 100) : null;

  if (responseRate !== null) {
    const contribution = Math.min(MAX_REPLY_CONTRIBUTION, Math.round((responseRate / 100) * MAX_REPLY_CONTRIBUTION));
    score += contribution;
    factors.push({
      label: "Response rate",
      contribution,
      explanation: `${signals.repliedCount} reply${signals.repliedCount === 1 ? "" : "ies"} out of ${signals.contactedCount} time${signals.contactedCount === 1 ? "" : "s"} contacted (${responseRate}%).`,
    });
  }

  if (signals.interviewCount > 0) {
    score += 20;
    factors.push({
      label: "Interview progress",
      contribution: 20,
      explanation: `${signals.interviewCount} connected interview${signals.interviewCount === 1 ? "" : "s"}.`,
    });
  }

  if (signals.offerOrAcceptedOpportunityCount > 0 || signals.hiredCount > 0) {
    score += 25;
    factors.push({
      label: "Offer/hire outcome",
      contribution: 25,
      explanation: "A connected opportunity reached offer/hired.",
    });
  }

  if (signals.connectedOpportunityCount > 1) {
    const contribution = Math.min(
      MAX_HISTORY_CONTRIBUTION,
      (signals.connectedOpportunityCount - 1) * 5,
    );
    score += contribution;
    factors.push({
      label: "Company history",
      contribution,
      explanation: `Connected to ${signals.connectedOpportunityCount} opportunities — a repeat relationship.`,
    });
  }

  if (signals.mostRecentInteractionType === "GHOSTED") {
    score -= 35;
    factors.push({ label: "Ghosted", contribution: -35, explanation: "The most recent logged interaction was a ghost." });
  } else if (signals.daysSinceLastInteraction !== null && signals.daysSinceLastInteraction > 30) {
    const contribution = -Math.min(20, Math.floor((signals.daysSinceLastInteraction - 30) / 7) * 5);
    score += contribution;
    if (contribution !== 0) {
      factors.push({
        label: "Response delay",
        contribution,
        explanation: `${signals.daysSinceLastInteraction} days since the last interaction.`,
      });
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), responseRate, factors };
}

export type RelationshipHealth = "STRONG" | "HEALTHY" | "WARM" | "COOLING" | "COLD" | "GHOSTED" | "INACTIVE";

export const RELATIONSHIP_HEALTH_LABEL: Record<RelationshipHealth, string> = {
  STRONG: "Strong",
  HEALTHY: "Healthy",
  WARM: "Warm",
  COOLING: "Cooling",
  COLD: "Cold",
  GHOSTED: "Ghosted",
  INACTIVE: "Inactive",
};

/** Module 8 — deterministic, first-match-wins (same idiom as
 * `deriveAgentStatus`/`deriveInterviewLifecycleLabel`). */
export function deriveRelationshipHealth(
  signals: Pick<RelationshipSignals, "mostRecentInteractionType" | "daysSinceLastInteraction" | "interactionCount">,
  score: number,
): RelationshipHealth {
  if (signals.mostRecentInteractionType === "GHOSTED") return "GHOSTED";
  if (signals.interactionCount === 0) return "INACTIVE";
  if (score >= 80) return "STRONG";
  if (signals.daysSinceLastInteraction !== null && signals.daysSinceLastInteraction > 45) return "COLD";
  if (signals.daysSinceLastInteraction !== null && signals.daysSinceLastInteraction > 21) return "COOLING";
  if (score >= 55) return "HEALTHY";
  return "WARM";
}
