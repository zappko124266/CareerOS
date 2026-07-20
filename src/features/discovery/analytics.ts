import "server-only";

import { prisma } from "@/lib/prisma";
import type { StatusHistory } from "@/features/opportunities/types";

/** Any status that can only be reached after the candidate started
 * talking to the company beyond a plain application — used to compute a
 * real interview-conversion rate from each saved opportunity's own
 * `statusHistory`, not just its current status (so an opportunity that
 * reached `INTERVIEWING` and was later `REJECTED` still counts as having
 * reached an interview). */
const INTERVIEW_REACHED_STATUSES = new Set([
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "JOINED",
  "DECLINED",
]);

export interface ConnectorLatency {
  connectorId: string;
  /** Sprint 9, Module 11 — the only latency signal available with zero
   * new schema is each `DiscoveryRun`'s own `completedAt - startedAt`,
   * which covers the whole run, not one connector in isolation (connectors
   * within a run aren't individually timed). This is that run-level
   * duration averaged across every run each connector participated in —
   * a real, honest number, just not a per-connector-call measurement. */
  averageDurationMs: number;
  runCount: number;
}

export interface DiscoveryAnalytics {
  jobsDiscovered: number;
  companiesDiscovered: number;
  duplicatesCollapsed: number;
  recommendationsAccepted: number;
  applicationsStarted: number;
  interviewsReached: number;
  /** `null` when there are no applications yet to compute a rate from —
   * never shown as `0%`, which would misleadingly read as "no one gets
   * interviews" rather than "not enough data yet." */
  interviewConversionRate: number | null;
  connectorLatency: ConnectorLatency[];
}

/** Sprint 9, Module 11 (per-user) / Module 12 (fleet-wide, Admin
 * Discovery Center) — Discovery Analytics. Every number here is a real
 * aggregate over `DiscoveryRun`/`DiscoveredListing`/`DiscoveredCompany`/
 * `Opportunity` rows — no estimates. Omitting `userId` computes the same
 * shape across every user, which is all the Admin Discovery Center needs
 * (no per-user drill-down, same "aggregate only, never impersonate"
 * discipline as the rest of `features/admin/queries.ts`). */
export async function getDiscoveryAnalytics(userId?: string): Promise<DiscoveryAnalytics> {
  const userScope = userId ? { userId } : {};

  const [
    jobsDiscovered,
    companiesDiscovered,
    runs,
    listingsSaved,
    companiesSaved,
    startedOpportunities,
  ] = await Promise.all([
    prisma.discoveredListing.count({ where: { ...userScope, duplicateOfId: null } }),
    prisma.discoveredCompany.count({ where: userScope }),
    prisma.discoveryRun.findMany({
      where: userScope,
      select: { duplicatesFound: true, connectorsUsed: true, startedAt: true, completedAt: true },
    }),
    prisma.discoveredListing.count({ where: { ...userScope, disposition: "SAVED" } }),
    prisma.discoveredCompany.count({ where: { ...userScope, disposition: "SAVED" } }),
    prisma.discoveredListing.findMany({
      where: { ...userScope, savedOpportunityId: { not: null } },
      select: { savedOpportunity: { select: { statusHistory: true } } },
    }),
  ]);

  const duplicatesCollapsed = runs.reduce((sum, run) => sum + run.duplicatesFound, 0);

  const applicationsStarted = startedOpportunities.length;
  const interviewsReached = startedOpportunities.filter((row) => {
    const history = (row.savedOpportunity?.statusHistory as unknown as StatusHistory) ?? [];
    return history.some((entry) => INTERVIEW_REACHED_STATUSES.has(entry.status));
  }).length;

  const latencyByConnector = new Map<string, { totalMs: number; count: number }>();
  for (const run of runs) {
    if (!run.completedAt) continue;
    const durationMs = run.completedAt.getTime() - run.startedAt.getTime();
    const connectors = Array.isArray(run.connectorsUsed)
      ? (run.connectorsUsed as unknown[]).filter((value): value is string => typeof value === "string")
      : [];
    for (const connectorId of connectors) {
      const entry = latencyByConnector.get(connectorId) ?? { totalMs: 0, count: 0 };
      entry.totalMs += durationMs;
      entry.count += 1;
      latencyByConnector.set(connectorId, entry);
    }
  }

  const connectorLatency: ConnectorLatency[] = Array.from(latencyByConnector.entries()).map(
    ([connectorId, { totalMs, count }]) => ({
      connectorId,
      averageDurationMs: Math.round(totalMs / count),
      runCount: count,
    }),
  );

  return {
    jobsDiscovered,
    companiesDiscovered,
    duplicatesCollapsed,
    recommendationsAccepted: listingsSaved + companiesSaved,
    applicationsStarted,
    interviewsReached,
    interviewConversionRate:
      applicationsStarted > 0 ? Math.round((interviewsReached / applicationsStarted) * 100) : null,
    connectorLatency,
  };
}
