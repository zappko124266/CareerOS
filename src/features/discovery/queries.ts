import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function getDiscoveryPreference(userId: string) {
  return prisma.discoveryPreference.findUnique({ where: { userId } });
}

export async function listConnectorPreferences(userId: string) {
  return prisma.connectorPreference.findMany({ where: { userId } });
}

export async function getOwnedDiscoveredListingOrThrow(listingId: string, userId: string) {
  const listing = await prisma.discoveredListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new NotFoundError("That listing doesn't exist.");
  if (listing.userId !== userId) throw new ForbiddenError("That listing doesn't belong to you.");
  return listing;
}

export async function getOwnedDiscoveredCompanyOrThrow(companyId: string, userId: string) {
  const company = await prisma.discoveredCompany.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError("That company doesn't exist.");
  if (company.userId !== userId) throw new ForbiddenError("That company doesn't belong to you.");
  return company;
}

export async function listDiscoveredListings(
  userId: string,
  disposition?: "NEW" | "SAVED" | "HIDDEN" | "REJECTED",
) {
  return prisma.discoveredListing.findMany({
    // Module 6 — Duplicate Engine: a listing recognized as the same
    // real-world job as another (different-source) listing is excluded
    // from every feed view — never deleted, just not shown as a second
    // independent result. See `DiscoveredListing.duplicateOfId`.
    where: { userId, duplicateOfId: null, ...(disposition ? { disposition } : {}) },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
  });
}

export async function listDiscoveredCompanies(
  userId: string,
  disposition?: "NEW" | "SAVED" | "HIDDEN" | "REJECTED",
) {
  return prisma.discoveredCompany.findMany({
    where: { userId, ...(disposition ? { disposition } : {}) },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
  });
}

export async function getLatestDiscoveryRun(userId: string) {
  return prisma.discoveryRun.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  });
}

export async function listDiscoveryRuns(userId: string, limit = 20) {
  return prisma.discoveryRun.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sprint 9, Module 8 — for each given requirement, how many *distinct
 * companies* among the user's own active (non-duplicate, non-hidden)
 * discovered listings already require it, e.g. "learning Kubernetes
 * unlocks 12 companies." Genuinely computed from real, already-stored
 * `DiscoveredListing.skills` arrays — never an AI estimate.
 *
 * Callers pass either short skill tags (e.g. "Kubernetes") or a full AI
 * gap requirement sentence (e.g. "Experience with Kubernetes"), so an
 * exact-string match against a listing's own short skill tags would
 * almost never hit for the latter. Instead, a listing counts as a match
 * when any of its own skill tags appears as a whole word inside the
 * given requirement text — case-insensitive, word-boundary matched to
 * avoid short tags (e.g. "Go") false-matching inside unrelated words
 * (e.g. "algorithm"). One query regardless of how many requirements are
 * checked, since `skills` is unindexed free-text JSON. */
export async function countCompaniesRequiringSkills(
  userId: string,
  requirements: string[],
): Promise<Record<string, number>> {
  if (requirements.length === 0) return {};

  const listings = await prisma.discoveredListing.findMany({
    where: { userId, duplicateOfId: null, disposition: { not: "HIDDEN" } },
    select: { companyName: true, skills: true },
  });

  const result: Record<string, number> = Object.fromEntries(requirements.map((r) => [r, 0]));
  const companiesByRequirement = new Map<string, Set<string>>(requirements.map((r) => [r, new Set()]));

  for (const listing of listings) {
    const listingSkills = Array.isArray(listing.skills)
      ? (listing.skills as unknown[])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      : [];
    if (listingSkills.length === 0) continue;

    for (const requirement of requirements) {
      const matches = listingSkills.some((skill) =>
        new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(requirement),
      );
      if (matches) companiesByRequirement.get(requirement)!.add(listing.companyName);
    }
  }

  for (const requirement of requirements) {
    result[requirement] = companiesByRequirement.get(requirement)!.size;
  }

  return result;
}

/** Everyone with a preference set to anything other than MANUAL_ONLY,
 * whose last run is old enough for their chosen frequency (or who has
 * never run at all) — what the scheduled cron endpoint iterates over.
 *
 * Was an N+1 (one `findFirst` per user with an active preference) —
 * fixed to 2 total queries via a single `groupBy` aggregate for
 * "each user's most recent run start time," since only the timestamp
 * (not the full row) is actually needed. */
export async function listUsersDueForDiscovery(now: Date) {
  const preferences = await prisma.discoveryPreference.findMany({
    where: { discoveryFrequency: { not: "MANUAL_ONLY" } },
  });

  if (preferences.length === 0) return [];

  const lastRuns = await prisma.discoveryRun.groupBy({
    by: ["userId"],
    where: { userId: { in: preferences.map((preference) => preference.userId) } },
    _max: { startedAt: true },
  });
  const lastRunStartedAtByUser = new Map(
    lastRuns.map((row) => [row.userId, row._max.startedAt]),
  );

  const dueUserIds: string[] = [];

  for (const preference of preferences) {
    const lastRunStartedAt = lastRunStartedAtByUser.get(preference.userId);

    if (!lastRunStartedAt) {
      dueUserIds.push(preference.userId);
      continue;
    }

    const intervalMs =
      preference.discoveryFrequency === "HOURLY"
        ? 60 * 60 * 1000
        : preference.discoveryFrequency === "DAILY"
          ? 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

    if (now.getTime() - lastRunStartedAt.getTime() >= intervalMs) {
      dueUserIds.push(preference.userId);
    }
  }

  return dueUserIds;
}
