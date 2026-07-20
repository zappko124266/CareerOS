import "server-only";

import { prisma } from "@/lib/prisma";

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** Sprint 9, Module 10 — Background Discovery Engine's stale-listing
 * pass. A `DiscoveredListing` still sitting at disposition `NEW` 30+
 * days after it was first found is clutter the user never acted on —
 * moved to `HIDDEN` (same as if the user had hidden it themselves) so
 * it drops out of the active feed, never deleted, fully reversible from
 * the Hidden tab. Fleet-wide (every user), since this runs from the
 * hourly cron alongside the discovery sweep, not per-user on demand. */
export async function hideStaleListings(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);

  const result = await prisma.discoveredListing.updateMany({
    where: { disposition: "NEW", createdAt: { lt: cutoff } },
    data: { disposition: "HIDDEN" },
  });

  return result.count;
}

/** Same staleness rule applied to `DiscoveredCompany` rows. */
export async function hideStaleCompanies(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_AFTER_MS);

  const result = await prisma.discoveredCompany.updateMany({
    where: { disposition: "NEW", createdAt: { lt: cutoff } },
    data: { disposition: "HIDDEN" },
  });

  return result.count;
}
