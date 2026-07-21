import type { Metadata } from "next";

import { DiscoveryWorkspace } from "@/components/opportunities/discovery-workspace";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { findCountry, findState } from "@/features/location/service";
import { decodeCityKey, decodeStateKey } from "@/features/location/types";
import { getAllProviders } from "@/features/opportunities/providers/registry";
import { getSavedSourceIds } from "@/features/opportunities/queries";
import type { OpportunitySearchInput } from "@/features/opportunities/types";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Opportunities" };

/** First real location the user picked during onboarding, as a plain
 * display string — cities/states are composite-encoded keys
 * (`src/features/location/types.ts`), so this decodes rather than
 * showing a raw key like "US:CA:Austin" in a search box. */
function firstLocationLabel(preference: {
  cities: string[];
  states: string[];
  countries: string[];
}): string | undefined {
  const city = preference.cities[0] && decodeCityKey(preference.cities[0]);
  if (city) return city.cityName;

  const state = preference.states[0] && decodeStateKey(preference.states[0]);
  if (state) return findState(state.countryCode, state.stateCode)?.name;

  const countryCode = preference.countries[0];
  if (countryCode) return findCountry(countryCode)?.name;

  return undefined;
}

export default async function OpportunitiesPage() {
  const user = await verifySession();

  const [providers, savedSourceIds, preference] = await Promise.all([
    getAllProviders(),
    getSavedSourceIds(user.id),
    getDiscoveryPreference(user.id),
  ]);

  const providerAvailability = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: provider.isConfigured(),
  }));

  // Sprint 1.5 (Personalization) — "Default filters must come from
  // onboarding preferences." Only sets a field when the user actually
  // answered it; an unconfigured preference still search with a plain
  // `{ page: 1 }`, same as before.
  const initialFilters: OpportunitySearchInput = { page: 1 };
  if (preference) {
    const preferredRoles = preference.preferredRoles as string[];
    if (preferredRoles.length > 0) initialFilters.query = preferredRoles[0];

    const location = firstLocationLabel({
      cities: preference.cities as string[],
      states: preference.states as string[],
      countries: preference.countries as string[],
    });
    if (location) initialFilters.location = location;

    if (preference.salaryMin) initialFilters.salaryMin = preference.salaryMin;

    const employmentTypes = preference.employmentTypes as string[];
    if (employmentTypes.length > 0) initialFilters.employmentType = employmentTypes[0];
  }

  return (
    <DiscoveryWorkspace
      providers={providerAvailability}
      initialSavedSourceIds={Array.from(savedSourceIds)}
      initialFilters={initialFilters}
    />
  );
}
