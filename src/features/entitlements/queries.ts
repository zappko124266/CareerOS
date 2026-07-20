import "server-only";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

import type { EntitlementOverrideInput, MeteredFeature, PlanTier } from "./types";

/**
 * `cache()`-wrapped (same de-dupe-within-a-request convention as
 * `getCurrentUser`) — `checkEntitlement` calls this once per feature, and
 * `getEntitlementSummary` (the Billing & Usage page) calls
 * `checkEntitlement` once per metered feature (17 today). Without this,
 * one page load fired 17 identical `Profile` lookups instead of 1 —
 * a real, measured duplicate-request issue, not a hypothetical one.
 */
export const getPlanTier = cache(async (userId: string): Promise<PlanTier> => {
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: userId },
    select: { planTier: true },
  });
  return profile.planTier;
});

export async function countUsageSince(
  userId: string,
  feature: MeteredFeature,
  since: Date,
): Promise<number> {
  return prisma.featureUsageEvent.count({
    where: { userId, feature, createdAt: { gte: since } },
  });
}

/** Same real count as `countUsageSince`, but every metered feature in one
 * query (`groupBy`) instead of one `count()` per feature — what
 * `getEntitlementSummary` (the Billing & Usage page) needs. */
export async function countAllUsageSince(
  userId: string,
  since: Date,
): Promise<Map<MeteredFeature, number>> {
  const rows = await prisma.featureUsageEvent.groupBy({
    by: ["feature"],
    where: { userId, createdAt: { gte: since } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.feature as MeteredFeature, row._count._all]));
}

export async function recordUsage(
  userId: string,
  feature: MeteredFeature,
): Promise<void> {
  await prisma.featureUsageEvent.create({ data: { userId, feature } });
}

/** `undefined` means no admin override exists for this user/feature — the
 * caller should fall back to the plan-tier default. */
export async function getEntitlementOverride(
  userId: string,
  feature: MeteredFeature,
) {
  return prisma.entitlementOverride.findUnique({
    where: { userId_feature: { userId, feature } },
  });
}

export async function listEntitlementOverridesForUser(userId: string) {
  return prisma.entitlementOverride.findMany({
    where: { userId },
    orderBy: { feature: "asc" },
  });
}

export async function upsertEntitlementOverride(
  input: EntitlementOverrideInput,
  createdByUserId: string,
) {
  return prisma.entitlementOverride.upsert({
    where: { userId_feature: { userId: input.userId, feature: input.feature } },
    create: {
      userId: input.userId,
      feature: input.feature,
      customLimit: input.customLimit,
      reason: input.reason,
      createdByUserId,
    },
    update: {
      customLimit: input.customLimit,
      reason: input.reason,
      createdByUserId,
    },
  });
}

export async function deleteEntitlementOverride(
  userId: string,
  feature: MeteredFeature,
): Promise<void> {
  await prisma.entitlementOverride.deleteMany({ where: { userId, feature } });
}
