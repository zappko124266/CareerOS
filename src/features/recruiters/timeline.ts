import type { CareerEvent } from "@/features/career-agent/types";

import { RECRUITER_INTERACTION_TYPE_LABEL } from "./types";
import type { RecruiterInteractionType } from "./types";

interface RecruiterLike {
  id: string;
  name: string;
  createdAt: Date;
}

interface InteractionLike {
  id: string;
  type: RecruiterInteractionType;
  occurredAt: Date;
  opportunityId: string | null;
}

interface ReferralStatusEntry {
  status: string;
  changedAt: string;
}

interface ReferralLike {
  id: string;
  statusHistory: unknown;
  companyName?: string | null;
}

const REFERRAL_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Referral Requested",
  PENDING: "Referral Pending",
  ACCEPTED: "Referral Accepted",
  REJECTED: "Referral Declined",
  COMPLETED: "Referral Completed",
};

function href(opportunityId: string | null, recruiterId: string): string {
  return opportunityId ? `/opportunities/${opportunityId}` : `/recruiters/${recruiterId}`;
}

/**
 * Module 3 — "Do NOT build another timeline. Reuse Career Memory." This
 * is the adapter: it reshapes real, already-persisted recruiter data
 * (`RecruiterInteraction`, `Referral.statusHistory` — the same
 * append-only pattern `Interview.stageHistory` already established) into
 * the existing `CareerEvent` shape, exactly like `gmail-intelligence/
 * memory.ts`'s `toCareerEvents` and `automation/history.ts`'s
 * `toCareerEvents` already do for their own sources. `career-agent/
 * inbox.ts`'s `buildCareerInboxEvents` merges the result in — this
 * function never sorts, dedupes, or renders anything itself.
 *
 * Deliberately does NOT emit "Interview Scheduled" or "Offer Received"
 * events — those already exist in Career Memory via the `interview` and
 * `opportunity` sources; emitting them again here would be exactly the
 * duplicate timeline this module forbids. "LinkedIn Conversation" is also
 * absent — no real LinkedIn data pipeline exists (only a profile URL
 * field), so it's never fabricated.
 */
export function toRecruiterCareerEvents(
  recruiter: RecruiterLike,
  interactions: InteractionLike[],
  referrals: ReferralLike[] = [],
): CareerEvent[] {
  const addedEvent: CareerEvent = {
    id: `recruiter-${recruiter.id}-added`,
    source: "recruiter",
    title: `Connection Added — ${recruiter.name}`,
    description: recruiter.name,
    timestamp: recruiter.createdAt,
    href: `/recruiters/${recruiter.id}`,
  };

  const interactionEvents: CareerEvent[] = interactions.map((interaction) => ({
    id: `recruiter-${recruiter.id}-interaction-${interaction.id}`,
    source: "recruiter",
    title: `${RECRUITER_INTERACTION_TYPE_LABEL[interaction.type]} — ${recruiter.name}`,
    description: recruiter.name,
    timestamp: interaction.occurredAt,
    href: href(interaction.opportunityId, recruiter.id),
  }));

  const referralEvents: CareerEvent[] = referrals.flatMap((referral) => {
    const history = Array.isArray(referral.statusHistory) ? (referral.statusHistory as ReferralStatusEntry[]) : [];
    return history
      .filter((entry) => entry.status in REFERRAL_STATUS_LABEL)
      .map((entry) => ({
        id: `referral-${referral.id}-${entry.status}-${entry.changedAt}`,
        source: "recruiter" as const,
        title: `${REFERRAL_STATUS_LABEL[entry.status]}${referral.companyName ? ` — ${referral.companyName}` : ""}`,
        description: recruiter.name,
        timestamp: new Date(entry.changedAt),
        href: `/recruiters/${recruiter.id}`,
      }));
  });

  return [addedEvent, ...interactionEvents, ...referralEvents];
}
