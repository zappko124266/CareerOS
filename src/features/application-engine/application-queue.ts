import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import type { RecommendationTier } from "@/features/opportunities/types";

import type { ApplicationDecision } from "./decision-engine";

/**
 * The Application Queue's lifecycle — Sprint 9, requirement 3. A real
 * state machine, not just a status label: `CANDIDATE`/`AI_REVIEW_PENDING`
 * are the in-flight states a future persisted/async version of this
 * pipeline would pass through; `SUBMITTED`/`FAILED` become reachable the
 * moment a real Easy-Apply connector exists (see
 * `connector-capabilities.ts`). Every entry this codebase actually
 * produces today terminates at `INELIGIBLE`, `AI_REVIEWED`, or
 * `BLOCKED_NO_CONNECTOR` — never `SUBMITTED`, since nothing here ever
 * fabricates a submission.
 */
export type ApplicationQueueStatus =
  | "CANDIDATE"
  | "INELIGIBLE"
  | "AI_REVIEW_PENDING"
  | "AI_REVIEWED"
  | "BLOCKED_NO_CONNECTOR"
  | "SUBMITTED"
  | "FAILED";

export interface AiReviewResult {
  opportunityId: string;
  recommendation: RecommendationTier;
  summary: string;
}

export interface ApplicationQueueEntry {
  opportunityId: string;
  title: string;
  companyName: string;
  status: ApplicationQueueStatus;
  tier: RecommendationTier | null;
  aiRecommendation: RecommendationTier | null;
  reasons: string[];
}

const AI_APPROVED_TIERS: RecommendationTier[] = ["strong_match", "good_match"];

/**
 * No new Prisma model or query — this is a pure builder over data the
 * orchestrator already computed this run (candidates from the Discovery
 * Pipeline, decisions from the Decision Engine, reviews from the AI
 * review step), the same "computed on demand, no duplicate storage"
 * discipline as Sprint 5's Career Memory.
 */
export function buildApplicationQueue(
  candidates: PriorityQueueRow[],
  decisions: ApplicationDecision[],
  aiReviews: AiReviewResult[],
): ApplicationQueueEntry[] {
  const decisionByOpportunityId = new Map(decisions.map((decision) => [decision.opportunityId, decision]));
  const reviewByOpportunityId = new Map(aiReviews.map((review) => [review.opportunityId, review]));

  return candidates.map((row): ApplicationQueueEntry => {
    const { opportunity, intelligence } = row;
    const decision = decisionByOpportunityId.get(opportunity.id);
    const review = reviewByOpportunityId.get(opportunity.id);

    const base = {
      opportunityId: opportunity.id,
      title: opportunity.title,
      companyName: opportunity.companyName,
      tier: intelligence.tier,
    };

    if (!decision) {
      return { ...base, status: "CANDIDATE", aiRecommendation: null, reasons: [] };
    }

    if (!decision.eligible && !decision.blockedByConnector) {
      return { ...base, status: "INELIGIBLE", aiRecommendation: null, reasons: decision.reasons };
    }

    if (review) {
      const approved = AI_APPROVED_TIERS.includes(review.recommendation);
      return {
        ...base,
        status: approved ? (decision.blockedByConnector ? "BLOCKED_NO_CONNECTOR" : "AI_REVIEWED") : "INELIGIBLE",
        aiRecommendation: review.recommendation,
        reasons: approved ? [...decision.reasons, review.summary] : [review.summary],
      };
    }

    return {
      ...base,
      status: decision.blockedByConnector ? "BLOCKED_NO_CONNECTOR" : "AI_REVIEW_PENDING",
      aiRecommendation: null,
      reasons: decision.reasons,
    };
  });
}
