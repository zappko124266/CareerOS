import "server-only";

import { prisma } from "@/lib/prisma";
import { getAllProviders } from "@/features/opportunities/providers/registry";
import { DB_SOURCE_TO_PROVIDER } from "@/features/opportunities/types";
import { getLatestDiscoveryRun, listConnectorPreferences } from "@/features/discovery/queries";

import { CONNECTOR_CATALOG, type ConnectorCatalogEntry } from "./catalog";

export type ConnectorAuthStatus = "AUTHENTICATED" | "NOT_CONFIGURED" | "NOT_REQUIRED";
export type ConnectorHealth = "HEALTHY" | "ERROR" | "UNKNOWN";

export interface ConnectorMarketplaceEntry extends ConnectorCatalogEntry {
  enabled: boolean;
  favorited: boolean;
  lastUsedAt: Date | null;
  jobsFound: number;
  applicationsSent: number;
  authStatus: ConnectorAuthStatus;
  health: ConnectorHealth;
  lastErrorMessage: string | null;
}

/**
 * Merges the static catalog with real per-user state (`ConnectorPreference`),
 * real configuration status (`isConfigured()`), the most recent discovery
 * run's errors (for health), and a real, self-reported applications-sent
 * count from `Opportunity` — every field the marketplace UI shows is
 * either static catalog metadata or something actually persisted, never a
 * fabricated statistic.
 */
export async function listConnectorMarketplaceEntries(
  userId: string,
): Promise<ConnectorMarketplaceEntry[]> {
  const [preferences, latestRun, configuredProviders, appliedOpportunities] = await Promise.all([
    listConnectorPreferences(userId),
    getLatestDiscoveryRun(userId),
    Promise.resolve(getAllProviders().filter((provider) => provider.isConfigured())),
    prisma.opportunity.findMany({
      where: { userId, status: { in: ["APPLIED", "APPLICATION_VIEWED", "RECRUITER_CONTACT", "SHORTLISTED", "INTERVIEWING", "OFFER", "ACCEPTED", "JOINED"] } },
      select: { source: true },
    }),
  ]);

  const preferenceByConnectorId = new Map(preferences.map((pref) => [pref.connectorId, pref]));
  const configuredIds = new Set<string>(configuredProviders.map((provider) => provider.id));
  const runErrors = (latestRun?.errors ?? []) as unknown as { connectorId: string; message: string }[];
  const errorByConnectorId = new Map(
    runErrors.map((error) => [error.connectorId, error.message]),
  );
  const appliedCountBySource = new Map<string, number>();
  for (const opportunity of appliedOpportunities) {
    const providerId = DB_SOURCE_TO_PROVIDER[opportunity.source];
    if (!providerId) continue;
    appliedCountBySource.set(providerId, (appliedCountBySource.get(providerId) ?? 0) + 1);
  }

  return CONNECTOR_CATALOG.map((entry): ConnectorMarketplaceEntry => {
    const preference = preferenceByConnectorId.get(entry.id);
    const isConfigured = configuredIds.has(entry.id);

    const authStatus: ConnectorAuthStatus = !entry.hasLiveSearch
      ? "NOT_REQUIRED"
      : !entry.requiresApiKey
        ? "NOT_REQUIRED"
        : isConfigured
          ? "AUTHENTICATED"
          : "NOT_CONFIGURED";

    const lastError = errorByConnectorId.get(entry.id) ?? null;
    const health: ConnectorHealth = !entry.hasLiveSearch
      ? "UNKNOWN"
      : lastError
        ? "ERROR"
        : preference?.lastUsedAt
          ? "HEALTHY"
          : "UNKNOWN";

    return {
      ...entry,
      enabled: preference?.enabled ?? true,
      favorited: preference?.favorited ?? false,
      lastUsedAt: preference?.lastUsedAt ?? null,
      jobsFound: preference?.jobsFound ?? 0,
      applicationsSent: appliedCountBySource.get(entry.id) ?? 0,
      authStatus,
      health,
      lastErrorMessage: lastError,
    };
  });
}
