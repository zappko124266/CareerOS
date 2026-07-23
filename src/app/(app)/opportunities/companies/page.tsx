import type { Metadata } from "next";

import { CompanyTracker } from "@/components/opportunities/company-tracker";
import { getCompanyAggregates } from "@/features/companies/service";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Company Tracker" };

/**
 * Sprint 12 (Job Studio), requirement 8 — the index page `/opportunities/
 * companies/[companyId]` never had. Reuses `listOpportunitiesForUser`
 * (already powers `/applications`) grouped by `companyId`, and
 * `getCompanyAggregates` (already powers the single-company Intelligence
 * page) per tracked company — zero new business logic, only new
 * composition. Dream companies (`DiscoveryPreference.preferredCompanies`)
 * without any saved opportunity yet are shown as "not yet linked" rather
 * than fabricating data for them.
 */
export default async function CompanyTrackerPage() {
  const user = await verifySession();

  const [opportunities, preference] = await Promise.all([
    listOpportunitiesForUser(user.id),
    getDiscoveryPreference(user.id),
  ]);

  const dreamCompanyNames = ((preference?.preferredCompanies as string[]) ?? []).filter(Boolean);
  const dreamCompanyNamesLower = new Set(dreamCompanyNames.map((name) => name.toLowerCase()));

  const byCompanyId = new Map<
    string,
    { companyId: string; companyName: string; opportunityCount: number }
  >();
  for (const opportunity of opportunities) {
    if (!opportunity.companyId) continue;
    const existing = byCompanyId.get(opportunity.companyId);
    if (existing) {
      existing.opportunityCount += 1;
    } else {
      byCompanyId.set(opportunity.companyId, {
        companyId: opportunity.companyId,
        companyName: opportunity.companyName,
        opportunityCount: 1,
      });
    }
  }

  const trackedCompanies = await Promise.all(
    Array.from(byCompanyId.values()).map(async (entry) => ({
      ...entry,
      isDreamCompany: dreamCompanyNamesLower.has(entry.companyName.toLowerCase()),
      aggregates: await getCompanyAggregates(entry.companyId),
    })),
  );

  const linkedNamesLower = new Set(trackedCompanies.map((c) => c.companyName.toLowerCase()));
  const unlinkedDreamCompanies = dreamCompanyNames.filter(
    (name) => !linkedNamesLower.has(name.toLowerCase()),
  );

  return (
    <CompanyTracker
      trackedCompanies={trackedCompanies}
      unlinkedDreamCompanies={unlinkedDreamCompanies}
    />
  );
}
