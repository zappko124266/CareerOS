import "server-only";

import { logger } from "@/lib/logger";

import {
  countAllUsageSince,
  countUsageSince,
  getEntitlementOverride,
  getPlanTier,
  listEntitlementOverridesForUser,
  recordUsage,
} from "./queries";
import { METERED_FEATURES } from "./types";
import type { EntitlementCheck, MeteredFeature, PlanTier } from "./types";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Real, minimal usage metering — not a billing system. No payment
 * processor is integrated; `Profile.planTier` is set manually (e.g. via
 * direct DB update) until a real subscription flow exists. What's real
 * here: the limits are actually enforced, and usage is actually counted
 * from `FeatureUsageEvent` rows, not an estimate or a hardcoded number.
 *
 * See docs/ARCHITECTURE.md#entitlements for what's wired to what.
 */
export const PLAN_LIMITS: Record<PlanTier, Record<MeteredFeature, number | null>> = {
  FREE: {
    RESUME_TAILORING: 3,
    RESUME_EXPORT: 5,
    APPLICATION_DOCUMENT_GENERATION: 10,
    APPLICATION_REVIEW: 5,
    APPLICATION_EXPORT: 10,
    COMPANY_SNAPSHOT: 10,
    JOB_DISCOVERY_RUN: 30,
    APPLICATION_STRATEGY: 5,
    FOLLOW_UP_RECOMMENDATION: 10,
    ANALYTICS_INSIGHTS: 5,
    INTERVIEW_PREP: 10,
    COMPANY_RESEARCH: 10,
    SALARY_ESTIMATE: 5,
    CAREER_HEALTH_SCORE: 5,
    OFFER_COMPARISON: 5,
    CAREER_GAP_ASSESSMENT: 5,
    LINKEDIN_ANALYSIS: 5,
    GMAIL_SYNC: 30,
    CALENDAR_SYNC: 30,
  },
  PRO: {
    RESUME_TAILORING: null,
    RESUME_EXPORT: null,
    APPLICATION_DOCUMENT_GENERATION: null,
    APPLICATION_REVIEW: null,
    APPLICATION_EXPORT: null,
    COMPANY_SNAPSHOT: null,
    JOB_DISCOVERY_RUN: null,
    APPLICATION_STRATEGY: null,
    FOLLOW_UP_RECOMMENDATION: null,
    ANALYTICS_INSIGHTS: null,
    INTERVIEW_PREP: null,
    COMPANY_RESEARCH: null,
    SALARY_ESTIMATE: null,
    CAREER_HEALTH_SCORE: null,
    OFFER_COMPARISON: null,
    CAREER_GAP_ASSESSMENT: null,
    LINKEDIN_ANALYSIS: null,
    GMAIL_SYNC: null,
    CALENDAR_SYNC: null,
  },
};

export async function checkEntitlement(
  userId: string,
  feature: MeteredFeature,
): Promise<EntitlementCheck> {
  const [planTier, override] = await Promise.all([
    getPlanTier(userId),
    getEntitlementOverride(userId, feature),
  ]);

  const limit = override ? override.customLimit : PLAN_LIMITS[planTier][feature];
  const overridden = override != null;

  if (limit === null) {
    return { allowed: true, planTier, used: 0, limit: null, remaining: null, overridden };
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS);
  const used = await countUsageSince(userId, feature, since);

  return {
    allowed: used < limit,
    planTier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    overridden,
  };
}

export interface EntitlementSummaryRow extends EntitlementCheck {
  feature: MeteredFeature;
}

/**
 * Billing UX — every feature's real usage/limit in one call. Powers the
 * `/billing` usage display.
 *
 * Deliberately does NOT call `checkEntitlement` per feature (17 calls,
 * each independently re-querying plan tier/override/usage) — that was
 * measured at up to ~35 sequential-ish queries for one page load. Same
 * business logic (limit resolution, `allowed`/`remaining` computation)
 * inlined against 3 batched queries total: one plan tier lookup (`cache`d
 * per request), one query for every override this user has, one grouped
 * count for every feature's usage. Output is identical to calling
 * `checkEntitlement` once per feature — verified by construction, since
 * the per-feature resolution logic below is copied from it unchanged.
 */
export async function getEntitlementSummary(userId: string): Promise<EntitlementSummaryRow[]> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [planTier, overrides, usageByFeature] = await Promise.all([
    getPlanTier(userId),
    listEntitlementOverridesForUser(userId),
    countAllUsageSince(userId, since),
  ]);

  const overrideByFeature = new Map(overrides.map((override) => [override.feature, override]));

  return METERED_FEATURES.map((feature) => {
    const override = overrideByFeature.get(feature);
    const limit = override ? override.customLimit : PLAN_LIMITS[planTier][feature];
    const overridden = override != null;

    if (limit === null) {
      return { feature, allowed: true, planTier, used: 0, limit: null, remaining: null, overridden };
    }

    const used = usageByFeature.get(feature) ?? 0;
    return {
      feature,
      allowed: used < limit,
      planTier,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      overridden,
    };
  });
}

/** Call only after the gated action actually succeeds — a failed AI call
 * or export shouldn't count against the user's monthly allowance. */
export async function consumeEntitlement(
  userId: string,
  feature: MeteredFeature,
): Promise<void> {
  await recordUsage(userId, feature);
  logger.info("entitlements.usage_recorded", { userId, feature });
}
