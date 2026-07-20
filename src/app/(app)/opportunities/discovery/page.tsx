import type { Metadata } from "next";

import { DiscoveryDashboard } from "@/components/opportunities/discovery/discovery-dashboard";
import { getDiscoveryAnalytics } from "@/features/discovery/analytics";
import { buildDiscoveryBriefing } from "@/features/discovery/briefing";
import { listConnectorMarketplaceEntries } from "@/features/discovery/connectors/status";
import {
  getDiscoveryPreference,
  getLatestDiscoveryRun,
  listDiscoveredCompanies,
  listDiscoveredListings,
  listDiscoveryRuns,
} from "@/features/discovery/queries";
import { verifySession } from "@/lib/auth/dal";
import type { CompanyMatchFactors } from "@/features/discovery/types";

export const metadata: Metadata = { title: "Job Discovery" };

export default async function DiscoveryPage() {
  const user = await verifySession();

  const [
    newListings,
    newCompanies,
    savedListings,
    savedCompanies,
    hiddenListingsRaw,
    rejectedListingsRaw,
    hiddenCompaniesRaw,
    rejectedCompaniesRaw,
    connectorEntries,
    preference,
    runs,
    latestRun,
    analytics,
  ] = await Promise.all([
    listDiscoveredListings(user.id, "NEW"),
    listDiscoveredCompanies(user.id, "NEW"),
    listDiscoveredListings(user.id, "SAVED"),
    listDiscoveredCompanies(user.id, "SAVED"),
    listDiscoveredListings(user.id, "HIDDEN"),
    listDiscoveredListings(user.id, "REJECTED"),
    listDiscoveredCompanies(user.id, "HIDDEN"),
    listDiscoveredCompanies(user.id, "REJECTED"),
    listConnectorMarketplaceEntries(user.id),
    getDiscoveryPreference(user.id),
    listDiscoveryRuns(user.id),
    getLatestDiscoveryRun(user.id),
    getDiscoveryAnalytics(user.id),
  ]);

  const dreamEmployerMatches = [...newCompanies, ...savedCompanies].filter((company) => {
    const factors = company.matchFactors as unknown as CompanyMatchFactors | null;
    return (factors?.companyPreferenceMatch.score ?? 0) >= 90;
  });

  const topEligibilityCompany = newCompanies.find(
    (company) => Array.isArray(company.eligibilityNotes) && company.eligibilityNotes.length > 0,
  );
  const topEligibilityNote =
    topEligibilityCompany && Array.isArray(topEligibilityCompany.eligibilityNotes)
      ? `Improving ${(topEligibilityCompany.eligibilityNotes as string[]).slice(0, 2).join(" and ")} would qualify you for more roles at ${topEligibilityCompany.companyName} and similar companies.`
      : null;

  const briefing = buildDiscoveryBriefing(latestRun, dreamEmployerMatches, topEligibilityNote);

  return (
    <DiscoveryDashboard
      briefing={briefing}
      newListings={newListings}
      newCompanies={newCompanies}
      savedListings={savedListings}
      savedCompanies={savedCompanies}
      hiddenListings={[...hiddenListingsRaw, ...rejectedListingsRaw]}
      hiddenCompanies={[...hiddenCompaniesRaw, ...rejectedCompaniesRaw]}
      connectorEntries={connectorEntries}
      preference={preference}
      runs={runs}
      analytics={analytics}
    />
  );
}
