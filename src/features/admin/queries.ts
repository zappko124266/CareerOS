import "server-only";

import { prisma } from "@/lib/prisma";
import { getDiscoveryAnalytics } from "@/features/discovery/analytics";
import { getAllProviders } from "@/features/opportunities/providers/registry";
import type { METERED_FEATURES } from "@/features/entitlements/types";

const RECENT_DISCOVERY_RUNS = 50;
const RECENT_SUBMISSIONS = 25;
const RECENT_AUDIT_LOGS = 50;
const AI_USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const GROWTH_TREND_DAYS = 14;
const RECENT_RUN_FAILURES = 20;

export interface ConnectorHealth {
  id: string;
  name: string;
  configured: boolean;
  runsUsedIn: number;
  errorCount: number;
}

/**
 * Module 11 — Connector Health. Every number here comes from the last
 * `RECENT_DISCOVERY_RUNS` real `DiscoveryRun` rows across all users
 * (`connectorsUsed`/`errors`, both written once at the end of each real
 * run — see `runDiscovery`) — never a synthetic uptime percentage.
 */
export async function getConnectorHealth(): Promise<ConnectorHealth[]> {
  const providers = getAllProviders();

  const recentRuns = await prisma.discoveryRun.findMany({
    orderBy: { startedAt: "desc" },
    take: RECENT_DISCOVERY_RUNS,
    select: { connectorsUsed: true, errors: true },
  });

  return providers.map((provider) => {
    let runsUsedIn = 0;
    let errorCount = 0;

    for (const run of recentRuns) {
      const connectorsUsed = (run.connectorsUsed ?? []) as string[];
      if (connectorsUsed.includes(provider.id)) runsUsedIn += 1;

      const errors = (run.errors ?? []) as Array<{ connectorId: string; message: string }>;
      errorCount += errors.filter((error) => error.connectorId === provider.id).length;
    }

    return {
      id: provider.id,
      name: provider.name,
      configured: provider.isConfigured(),
      runsUsedIn,
      errorCount,
    };
  });
}

export async function listRecentApplicationSubmissions() {
  return prisma.applicationSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_SUBMISSIONS,
    include: { opportunity: { select: { title: true, companyName: true, userId: true } } },
  });
}

export async function listFailedApplicationSubmissions() {
  return prisma.applicationSubmission.findMany({
    where: { result: "FAILED" },
    orderBy: { updatedAt: "desc" },
    take: RECENT_SUBMISSIONS,
    include: { opportunity: { select: { title: true, companyName: true, userId: true } } },
  });
}

export async function listRetriedApplicationSubmissions() {
  return prisma.applicationSubmission.findMany({
    where: { retryCount: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: RECENT_SUBMISSIONS,
    include: { opportunity: { select: { title: true, companyName: true, userId: true } } },
  });
}

export async function listRecentAuditLogs() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: RECENT_AUDIT_LOGS,
    include: { user: { select: { email: true } } },
  });
}

export interface AiUsageSummaryRow {
  feature: (typeof METERED_FEATURES)[number];
  count: number;
}

/** Real counts of `FeatureUsageEvent` rows in the last 30 days, grouped by
 * feature — the same rows `checkEntitlement` counts against a user's
 * plan limit, just aggregated across every user instead of one. */
export async function getAiUsageSummary(): Promise<AiUsageSummaryRow[]> {
  const since = new Date(Date.now() - AI_USAGE_WINDOW_MS);

  const grouped = await prisma.featureUsageEvent.groupBy({
    by: ["feature"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { feature: "desc" } },
  });

  return grouped.map((row) => ({
    feature: row.feature as (typeof METERED_FEATURES)[number],
    count: row._count._all,
  }));
}

export async function listUsersForAdmin(searchQuery?: string) {
  return prisma.profile.findMany({
    where: searchQuery
      ? {
          OR: [
            { email: { contains: searchQuery, mode: "insensitive" } },
            { fullName: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUserForAdmin(userId: string) {
  return prisma.profile.findUnique({ where: { id: userId } });
}

export async function getUserApplicationTimeline(userId: string) {
  return prisma.opportunity.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      companyName: true,
      status: true,
      statusHistory: true,
      updatedAt: true,
    },
  });
}

/** Module 13 — Admin Extensions. Every function below is a read-only view
 * over a specific user's own real data, scoped by `userId` — no
 * impersonation, no way to act as the user, same discipline as the rest
 * of this file. */
export async function getUserInterviewTimeline(userId: string) {
  return prisma.interview.findMany({
    where: { opportunity: { userId } },
    orderBy: { updatedAt: "desc" },
    include: {
      opportunity: { select: { id: true, title: true, companyName: true } },
      recruiter: { select: { name: true } },
    },
  });
}

export async function getUserRecruiterHistory(userId: string) {
  return prisma.recruiter.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { name: true } },
      _count: { select: { interactions: true } },
    },
  });
}

export async function getUserOfferHistory(userId: string) {
  return prisma.offer.findMany({
    where: { opportunity: { userId } },
    orderBy: { updatedAt: "desc" },
    include: { opportunity: { select: { id: true, title: true, companyName: true, status: true } } },
  });
}

/** Fleet-wide Company Intelligence view for `/admin` — the same shared
 * `Company` rows the public `/opportunities/companies/[companyId]` page
 * reads, just listed for browsing rather than looked up one at a time. */
export async function listCompaniesForAdmin() {
  return prisma.company.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { _count: { select: { opportunities: true, recruiters: true } } },
  });
}

export async function getUserCareerHealthHistory(userId: string) {
  return prisma.careerHealthScore.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

// ---------------------------------------------------------------------------
// Sprint 9, Module 12 — Admin Discovery Center

/** Fleet-wide version of `getDiscoveryAnalytics` (Module 11) — same real
 * aggregates, just without a `userId` filter. No per-user drill-down here,
 * same "aggregate only, never impersonate" rule as the rest of this file. */
export async function getFleetDiscoveryAnalytics() {
  return getDiscoveryAnalytics();
}

export interface DiscoveryRunFailure {
  runId: string;
  userId: string;
  startedAt: Date;
  connectorId: string;
  message: string;
}

/** Real failure detail — the actual `DiscoveryRun.errors` messages
 * (`[{connectorId, message}]`, written by `runDiscovery`), not just a
 * bare count like `getConnectorHealth` shows. Only `userId` is exposed
 * alongside them (never the user's own resume/application content) —
 * same metadata-only convention as `listRecentApplicationSubmissions`. */
export async function listDiscoveryRunFailures(): Promise<DiscoveryRunFailure[]> {
  const runs = await prisma.discoveryRun.findMany({
    where: { NOT: { errors: { equals: [] } } },
    orderBy: { startedAt: "desc" },
    take: RECENT_RUN_FAILURES,
    select: { id: true, userId: true, startedAt: true, errors: true },
  });

  return runs.flatMap((run) => {
    const errors = (run.errors ?? []) as Array<{ connectorId: string; message: string }>;
    return errors.map((error) => ({
      runId: run.id,
      userId: run.userId,
      startedAt: run.startedAt,
      connectorId: error.connectorId,
      message: error.message,
    }));
  });
}

export interface DiscoveryGrowthDay {
  date: string;
  jobsDiscovered: number;
  companiesDiscovered: number;
}

/** Day-bucketed growth trend over the last `GROWTH_TREND_DAYS` days,
 * computed in application code from already-fetched `createdAt` values —
 * no new SQL, same "plain aggregation over real rows" discipline as
 * every other admin query here. */
export async function getDiscoveryGrowthTrend(): Promise<DiscoveryGrowthDay[]> {
  const since = new Date(Date.now() - GROWTH_TREND_DAYS * 24 * 60 * 60 * 1000);

  const [listings, companies] = await Promise.all([
    prisma.discoveredListing.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.discoveredCompany.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const days: DiscoveryGrowthDay[] = [];
  for (let i = GROWTH_TREND_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    days.push({ date, jobsDiscovered: 0, companiesDiscovered: 0 });
  }
  const dayByDate = new Map(days.map((day) => [day.date, day]));

  for (const listing of listings) {
    const date = listing.createdAt.toISOString().slice(0, 10);
    const day = dayByDate.get(date);
    if (day) day.jobsDiscovered += 1;
  }
  for (const company of companies) {
    const date = company.createdAt.toISOString().slice(0, 10);
    const day = dayByDate.get(date);
    if (day) day.companiesDiscovered += 1;
  }

  return days;
}
