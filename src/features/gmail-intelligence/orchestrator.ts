import "server-only";

import type { ConnectionSummary } from "@/features/connectors/manager";
import type { CareerEvent } from "@/features/career-agent/types";

import { buildGmailIntelligenceSummary, getLastGmailSyncedAt, listRecentGmailCareerEvents, toCareerEvents } from "./memory";
import { syncGmailCareerIntelligenceForUser } from "./service";
import type { GmailIntelligenceSummary, GmailSyncSummary } from "./types";

export interface GmailIntelligenceReport {
  summary: GmailIntelligenceSummary;
  /** Real Gmail-derived rows reshaped into the existing `CareerEvent`
   * shape — Step 5's Career Memory integration. This is the *full*
   * recent event set (not reconstructed from `summary`'s per-category
   * buckets, which would silently drop `APPLICATION_CONFIRMATION` —
   * every classification the summary doesn't bucket separately). */
  careerEvents: CareerEvent[];
  lastSyncedAt: Date | null;
}

/**
 * The Gmail Intelligence Engine's single coordination point (Step 2:
 * "Everything should flow through one orchestrator"). Every other
 * feature — Career Brain, the `gmail_sync` automation task, the
 * dashboard card — imports from here, never from `service.ts`/`memory.ts`/
 * `classifier.ts`/`extractor.ts` directly. Two responsibilities, kept
 * deliberately separate:
 *
 * - `runGmailIntelligenceSync` — the only path that touches the real
 *   Gmail API (via `service.ts`). Called by the `gmail_sync` automation
 *   task on a schedule; never called from a page render — external
 *   network-call latency doesn't belong in a dashboard's request path
 *   (the same "on-demand signals need an explicit trigger" discipline
 *   `docs/ARCHITECTURE.md`'s Dashboard section already established).
 * - `getGmailIntelligenceReport` — read-only, DB-only, fast. This is
 *   what `getCareerBrain` calls on every page load; it never triggers a
 *   sync itself, only reads whatever the most recent scheduled sync
 *   already persisted. Takes `connectionSummaries` as a parameter
 *   (rather than calling `listConnectionSummaries` itself) because
 *   `getCareerBrain` already fetches it once for `raw.connectionSummaries`
 *   — see that file's own comment on why this avoids a second,
 *   duplicate connector query in the same request.
 */
export async function runGmailIntelligenceSync(userId: string, now: Date = new Date()): Promise<GmailSyncSummary> {
  return syncGmailCareerIntelligenceForUser(userId, now);
}

export async function getGmailIntelligenceReport(
  userId: string,
  connectionSummaries: ConnectionSummary[],
): Promise<GmailIntelligenceReport> {
  const [events, lastSyncedAt] = await Promise.all([listRecentGmailCareerEvents(userId), getLastGmailSyncedAt(userId)]);

  const connected = connectionSummaries.some((summary) => summary.provider === "GOOGLE" && summary.status === "CONNECTED");

  return {
    summary: buildGmailIntelligenceSummary(events, connected),
    careerEvents: toCareerEvents(events),
    lastSyncedAt,
  };
}
