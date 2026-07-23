import type { Recruiter, RecruiterInteraction, Referral } from "@/generated/prisma/client";

import { buildContactWindow, buildRelationshipSignals } from "./relationship";
import { computeRelationshipScore, deriveRelationshipHealth, RELATIONSHIP_HEALTH_LABEL } from "./scoring";
import type { RelationshipHealth, RelationshipScoreResult } from "./scoring";

type RecruiterRow = Recruiter & {
  company: { id: string; name: string } | null;
  interactions: RecruiterInteraction[];
  interviews: { id: string; opportunityId: string; stage: string; scheduledAt: Date | null }[];
};

export interface EnrichedRecruiter extends RecruiterRow {
  relationship: RelationshipScoreResult;
  health: RelationshipHealth;
  firstContact: Date | null;
  lastContact: Date | null;
  daysSinceLastInteraction: number | null;
  connectedOpportunityIds: string[];
}

export interface NetworkHealthSummary {
  totalRecruiters: number;
  averageScore: number;
  byHealth: Record<RelationshipHealth, number>;
}

export interface RecruiterIntelligenceSummary {
  recruiters: EnrichedRecruiter[];
  relationshipSummary: Record<RelationshipHealth, number>;
  networkHealth: NetworkHealthSummary;
  pendingFollowUps: EnrichedRecruiter[];
  referrals: Referral[];
}

const OFFER_STAGE_SET = new Set(["OFFER", "ACCEPTED"]);

/**
 * Module 7 — the one place Career Brain reaches into to expose
 * `brain.recruiters`/`relationshipSummary`/`networkHealth`/
 * `pendingFollowUps`/`referrals`. Pure — every input is data
 * `getCareerBrain` already fetched in its one additional query batch
 * (`listRecruitersForUser`, `listReferralsForUser`); this function makes
 * zero further queries, mirroring how `interviewIntelligence` is a pure
 * derivation over `raw.interviewEvents` in `career-brain/brain.ts`.
 */
export function buildRecruiterIntelligenceSummary(
  recruiters: RecruiterRow[],
  referrals: Referral[],
  now: Date = new Date(),
): RecruiterIntelligenceSummary {
  const enriched: EnrichedRecruiter[] = recruiters.map((recruiter) => {
    const window = buildContactWindow(recruiter.interactions, now);
    const connectedOpportunityIds = Array.from(
      new Set([
        ...recruiter.interviews.map((interview) => interview.opportunityId),
        ...recruiter.interactions
          .map((interaction) => interaction.opportunityId)
          .filter((id): id is string => id !== null),
      ]),
    );

    const signals = buildRelationshipSignals({
      interactions: recruiter.interactions,
      interviewCount: recruiter.interviews.length,
      offerOrAcceptedOpportunityCount: recruiter.interviews.filter((interview) => OFFER_STAGE_SET.has(interview.stage))
        .length,
      connectedOpportunityCount: connectedOpportunityIds.length,
      now,
    });

    const relationship = computeRelationshipScore(signals);
    const health = deriveRelationshipHealth(signals, relationship.score);

    return {
      ...recruiter,
      relationship,
      health,
      firstContact: window.firstContact,
      lastContact: window.lastContact,
      daysSinceLastInteraction: window.daysSinceLastInteraction,
      connectedOpportunityIds,
    };
  });

  const relationshipSummary = Object.fromEntries(
    Object.keys(RELATIONSHIP_HEALTH_LABEL).map((health) => [
      health,
      enriched.filter((recruiter) => recruiter.health === health).length,
    ]),
  ) as Record<RelationshipHealth, number>;

  const networkHealth: NetworkHealthSummary = {
    totalRecruiters: enriched.length,
    averageScore: enriched.length
      ? Math.round(enriched.reduce((sum, recruiter) => sum + recruiter.relationship.score, 0) / enriched.length)
      : 0,
    byHealth: relationshipSummary,
  };

  // Module 12 — "waiting on a reply" signal: the most recent logged
  // interaction was an outreach (CONTACTED/INTERVIEW_REQUESTED) with no
  // later REPLIED, and enough real time has passed that a nudge is
  // warranted — never a fixed "every recruiter needs follow-up" list.
  const pendingFollowUps = enriched
    .filter(
      (recruiter) =>
        (recruiter.health === "COOLING" || recruiter.health === "COLD") &&
        (recruiter.relationship.responseRate === null || recruiter.relationship.responseRate < 100) &&
        recruiter.daysSinceLastInteraction !== null,
    )
    .sort((a, b) => (b.daysSinceLastInteraction ?? 0) - (a.daysSinceLastInteraction ?? 0));

  return {
    recruiters: enriched,
    relationshipSummary,
    networkHealth,
    pendingFollowUps,
    referrals,
  };
}

/** Small helper for the per-recruiter workspace page, which needs "this
 * recruiter's referrals" without recomputing the whole summary above. */
export function referralsForRecruiter(referrals: Referral[], recruiterId: string): Referral[] {
  return referrals.filter((referral) => referral.recruiterId === recruiterId);
}
