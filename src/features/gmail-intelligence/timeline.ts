import type { GmailCareerClassification } from "@/generated/prisma/client";

import type { GmailCareerEventDTO } from "./types";

export interface GmailThreadTimeline {
  threadId: string;
  company: string | null;
  events: GmailCareerEventDTO[];
  latestClassification: GmailCareerClassification;
  latestReceivedAt: Date;
}

/**
 * Groups classified Gmail events by Gmail's own `threadId` — a single
 * real job application conversation (confirmation → interview invite →
 * offer/rejection) usually spans several emails in one thread. This is
 * what lets the Career Inbox Intelligence card show one representative
 * row per real conversation instead of one row per email, without
 * hiding any underlying event (`events` on each group still has every
 * one, oldest first). `company` is taken from whichever event in the
 * thread actually extracted one — real data already extracted
 * per-message by `extractor.ts`, never re-derived here.
 */
export function groupGmailEventsByThread(events: GmailCareerEventDTO[]): GmailThreadTimeline[] {
  const byThread = new Map<string, GmailCareerEventDTO[]>();
  for (const event of events) {
    const existing = byThread.get(event.threadId);
    if (existing) existing.push(event);
    else byThread.set(event.threadId, [event]);
  }

  const groups: GmailThreadTimeline[] = Array.from(byThread.entries()).map(([threadId, threadEvents]) => {
    const sorted = [...threadEvents].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
    const latest = sorted[sorted.length - 1];
    return {
      threadId,
      company: sorted.find((event) => event.company !== null)?.company ?? null,
      events: sorted,
      latestClassification: latest.classification,
      latestReceivedAt: latest.receivedAt,
    };
  });

  return groups.sort((a, b) => b.latestReceivedAt.getTime() - a.latestReceivedAt.getTime());
}
