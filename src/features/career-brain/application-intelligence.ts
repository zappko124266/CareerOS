import type { ApplicationAnalytics } from "@/features/analytics/service";

import type { ApplicationIntelligence } from "./types";

/**
 * Application Intelligence builder — a reshaped subset of
 * `ApplicationAnalytics` (`features/analytics/service.ts`), the single
 * already-existing source of every application aggregate (success
 * patterns, interview conversion, offer tracking, rejection trends). No
 * parallel counting logic — every number here is a direct pass-through.
 */
export function buildApplicationIntelligence(analytics: ApplicationAnalytics): ApplicationIntelligence {
  return {
    totalApplications: analytics.totalApplications,
    interviewRate: analytics.interviewRate,
    offerRate: analytics.offerRate,
    responseRate: analytics.responseRate,
    totalRejections: analytics.totalRejections,
    rejectionRate: analytics.rejectionRate,
    bestCompanies: analytics.bestCompanies,
    bestRoles: analytics.bestRoles,
    coverLetterResponseRateWith: analytics.coverLetterResponseRateWith,
    coverLetterResponseRateWithout: analytics.coverLetterResponseRateWithout,
  };
}
