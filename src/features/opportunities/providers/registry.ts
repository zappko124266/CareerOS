import "server-only";

import { adzunaProvider } from "./adzuna";
import { arbeitnowProvider } from "./arbeitnow";
import { greenhouseProvider } from "./greenhouse";
import { joobleProvider } from "./jooble";
import { leverProvider } from "./lever";
import { reedProvider } from "./reed";
import { remoteokProvider } from "./remoteok";
import { usajobsProvider } from "./usajobs";
import type { OpportunityProviderAdapter, OpportunityProviderId } from "./types";

/**
 * The only place that lists every connector. To add a new one: create
 * `providers/<name>.ts` implementing `OpportunityProviderAdapter`, add its
 * id to `OPPORTUNITY_PROVIDER_IDS` in `types.ts`, and register it here.
 * `service.ts` and every caller of `searchOpportunities` never need to
 * change. (See also `features/discovery/connectors/catalog.ts` for the
 * much larger marketplace catalog of platforms that don't have a live
 * search adapter at all.)
 */
const PROVIDER_REGISTRY: Record<OpportunityProviderId, OpportunityProviderAdapter> = {
  adzuna: adzunaProvider,
  jooble: joobleProvider,
  arbeitnow: arbeitnowProvider,
  remoteok: remoteokProvider,
  greenhouse: greenhouseProvider,
  lever: leverProvider,
  usajobs: usajobsProvider,
  reed: reedProvider,
};

export function getAllProviders(): OpportunityProviderAdapter[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getConfiguredProviders(): OpportunityProviderAdapter[] {
  return getAllProviders().filter((provider) => provider.isConfigured());
}
