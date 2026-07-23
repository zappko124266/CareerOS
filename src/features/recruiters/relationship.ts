import type { RelationshipSignals } from "./scoring";
import type { RecruiterInteractionType } from "./types";

export interface RecruiterInteractionLike {
  type: RecruiterInteractionType;
  occurredAt: Date;
}

/** Module 1 — real, derived "First Contact"/"Last Contact." Never a
 * separate stored column (same "derive, don't duplicate" discipline as
 * `Interview.stageHistory`-derived `daysWaiting`): both are always
 * recomputable from `RecruiterInteraction.occurredAt`. */
export interface RecruiterContactWindow {
  firstContact: Date | null;
  lastContact: Date | null;
  mostRecentInteractionType: RecruiterInteractionType | null;
  daysSinceLastInteraction: number | null;
}

export function buildContactWindow(interactions: RecruiterInteractionLike[], now: Date = new Date()): RecruiterContactWindow {
  if (interactions.length === 0) {
    return { firstContact: null, lastContact: null, mostRecentInteractionType: null, daysSinceLastInteraction: null };
  }

  const sorted = [...interactions].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daysSinceLastInteraction = Math.max(0, Math.floor((now.getTime() - last.occurredAt.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    firstContact: first.occurredAt,
    lastContact: last.occurredAt,
    mostRecentInteractionType: last.type,
    daysSinceLastInteraction,
  };
}

/** Module 2 — assembles `RelationshipSignals` (`scoring.ts`) from real
 * interaction rows and real connected-entity counts this caller already
 * fetched (Career Brain's lightweight recruiter list, or the richer
 * per-recruiter workspace query) — one shared signal-builder, not one
 * per caller. */
export function buildRelationshipSignals(input: {
  interactions: RecruiterInteractionLike[];
  interviewCount: number;
  offerOrAcceptedOpportunityCount: number;
  connectedOpportunityCount: number;
  now?: Date;
}): RelationshipSignals {
  const now = input.now ?? new Date();
  const window = buildContactWindow(input.interactions, now);

  return {
    interactionCount: input.interactions.length,
    contactedCount: input.interactions.filter((i) => i.type === "CONTACTED").length,
    repliedCount: input.interactions.filter((i) => i.type === "REPLIED").length,
    ghostedCount: input.interactions.filter((i) => i.type === "GHOSTED").length,
    hiredCount: input.interactions.filter((i) => i.type === "HIRED").length,
    interviewCount: input.interviewCount,
    offerOrAcceptedOpportunityCount: input.offerOrAcceptedOpportunityCount,
    connectedOpportunityCount: input.connectedOpportunityCount,
    mostRecentInteractionType: window.mostRecentInteractionType,
    daysSinceLastInteraction: window.daysSinceLastInteraction,
  };
}
