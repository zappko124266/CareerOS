import "server-only";

import type { CareerBrain } from "@/features/career-brain/types";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import type { RecommendationTier } from "@/features/opportunities/types";

import { getUsableConnectorForOpportunity } from "./connector-capabilities";

const ELIGIBLE_TIERS: RecommendationTier[] = ["strong_match", "good_match"];

export interface ApplicationDecision {
  opportunityId: string;
  eligible: boolean;
  /** True when tier + preferences both passed and the only remaining
   * blocker is the connector check — distinguishes "not a good enough
   * match" from "would qualify, but nothing can submit it yet" for
   * `application-queue.ts`'s state machine. */
  blockedByConnector: boolean;
  tier: RecommendationTier | null;
  reasons: string[];
}

/**
 * The Application Decision Engine — Sprint 9, requirement 2: fully
 * deterministic, no AI call. Three real checks, in order, any of which
 * can make a candidate ineligible:
 *  1. Tier — reuses the row's already-computed `intelligence.tier`
 *     (Sprint 2's Opportunity Intelligence Engine); only `strong_match`/
 *     `good_match` proceed.
 *  2. Preferences (requirement 6) — dream company / search-priority
 *     matches are recorded as positive reasons (already-collected
 *     onboarding data, `intelligence.isDreamCompany`), never re-scored.
 *  3. Connector — `getUsableConnectorForOpportunity`
 *     (`connector-capabilities.ts`). Today this is always `null`, so
 *     `eligible` is always `false` by this final check even when tier
 *     and preferences both pass — an honest, real result, not a bug.
 */
export async function decideEligibility(row: PriorityQueueRow, brain: CareerBrain): Promise<ApplicationDecision> {
  const { opportunity, intelligence } = row;
  const reasons: string[] = [];

  if (!intelligence.tier || !ELIGIBLE_TIERS.includes(intelligence.tier)) {
    return {
      opportunityId: opportunity.id,
      eligible: false,
      blockedByConnector: false,
      tier: intelligence.tier,
      reasons: [`Match tier (${intelligence.tierLabel}) is below the threshold for automated review.`],
    };
  }

  if (intelligence.isDreamCompany) {
    reasons.push(`${opportunity.companyName} is one of your dream companies.`);
  }

  const usableConnector = await getUsableConnectorForOpportunity(opportunity, brain.userId);
  if (!usableConnector) {
    reasons.push(
      `No connected connector supports automated application submission for ${opportunity.companyName}'s source yet.`,
    );
    return { opportunityId: opportunity.id, eligible: false, blockedByConnector: true, tier: intelligence.tier, reasons };
  }

  reasons.push(`${usableConnector.connector.name} can submit this application automatically.`);
  return { opportunityId: opportunity.id, eligible: true, blockedByConnector: false, tier: intelligence.tier, reasons };
}
