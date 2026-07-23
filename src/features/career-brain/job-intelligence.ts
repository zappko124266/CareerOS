import { buildLocationSummary } from "@/features/discovery/types";
import type { DiscoveryPreference } from "@/generated/prisma/client";

import type { JobIntelligence } from "./types";

/**
 * Job Intelligence builder — a direct reshape of the onboarding
 * `DiscoveryPreference` row plus the saved-opportunity count already
 * fetched by `getCareerBrain`. No new query, no new preference
 * taxonomy — dream companies/industries/location are exactly what the
 * onboarding wizard and Discovery Preferences panel already collect.
 */
export function buildJobIntelligence(input: {
  preference: DiscoveryPreference | null;
  savedOpportunityCount: number;
}): JobIntelligence {
  const { preference, savedOpportunityCount } = input;

  return {
    dreamCompanies: (preference?.preferredCompanies as string[]) ?? [],
    preferredIndustries: (preference?.industries as string[]) ?? [],
    locationSummary: preference
      ? buildLocationSummary({
          countries: preference.countries as string[],
          states: preference.states as string[],
          cities: preference.cities as string[],
          remote: preference.remote,
          hybrid: preference.hybrid,
          onsite: preference.onsite,
          openToRelocation: preference.openToRelocation,
        })
      : null,
    remote: preference?.remote ?? true,
    hybrid: preference?.hybrid ?? true,
    onsite: preference?.onsite ?? true,
    openToRelocation: preference?.openToRelocation ?? false,
    savedOpportunityCount,
  };
}
