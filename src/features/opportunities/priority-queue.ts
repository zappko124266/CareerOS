import type { Opportunity } from "@/generated/prisma/client";

import type { OpportunityIntelligence } from "./intelligence";
import type { RecommendationTier } from "./types";

export interface PriorityQueueRow {
  opportunity: Opportunity;
  intelligence: OpportunityIntelligence;
}

export interface PriorityTier {
  key: RecommendationTier | "needs_resume";
  title: string;
  description: string;
  rows: PriorityQueueRow[];
}

const TIER_ORDER: { key: RecommendationTier | "needs_resume"; title: string; description: string }[] = [
  {
    key: "strong_match",
    title: "Top priority",
    description: "Your best-fitting saved opportunities — act on these first.",
  },
  {
    key: "good_match",
    title: "Strong matches",
    description: "Solid fits worth moving forward on.",
  },
  {
    key: "stretch",
    title: "Worth exploring",
    description: "A real but partial fit — some gaps to close.",
  },
  {
    key: "not_a_match",
    title: "Long shots",
    description: "Currently a weak fit against your resume.",
  },
  {
    key: "needs_resume",
    title: "Add a resume",
    description: "Upload a resume to see how these fit.",
  },
];

/**
 * Sprint 2 — the Priority Queue for saved Opportunities. Mirrors
 * `discovery/shelves.ts`'s "compute once upstream, then pure array ops"
 * discipline one level up: buckets rows the caller has already run
 * through `buildOpportunityIntelligence` (one shared `getResumeMatchProfile`
 * call upstream), so this itself performs zero DB/AI calls. Empty tiers
 * are omitted rather than rendered blank, same convention as
 * `buildDiscoveryShelves`. Dream-company opportunities sort first within
 * their tier — the existing dream-company signal stays a per-row badge
 * and tiebreaker rather than a separate top-level bucket.
 */
export function buildApplicationsPriorityQueue(rows: PriorityQueueRow[]): PriorityTier[] {
  return TIER_ORDER.map(({ key, title, description }) => {
    const matching = rows.filter((row) =>
      key === "needs_resume" ? row.intelligence.tier === null : row.intelligence.tier === key,
    );
    matching.sort((a, b) => {
      if (a.intelligence.isDreamCompany !== b.intelligence.isDreamCompany) {
        return a.intelligence.isDreamCompany ? -1 : 1;
      }
      return b.opportunity.updatedAt.getTime() - a.opportunity.updatedAt.getTime();
    });
    return { key, title, description, rows: matching };
  }).filter((tier) => tier.rows.length > 0);
}
