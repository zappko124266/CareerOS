import "server-only";

import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";
import { getOwnedOpportunityOrThrow } from "@/features/opportunities/queries";
import { saveOpportunity } from "@/features/opportunities/service";
import { DB_SOURCE_TO_PROVIDER } from "@/features/opportunities/types";

import {
  encodeCityKey,
  encodeStateKey,
} from "@/features/location/types";
import {
  getOwnedDiscoveredCompanyOrThrow,
  getOwnedDiscoveredListingOrThrow,
} from "./queries";
import type {
  ConnectorPreferenceInput,
  DiscoveryDisposition,
  DiscoveryPreferenceInput,
} from "./types";

export async function upsertDiscoveryPreference(
  userId: string,
  input: DiscoveryPreferenceInput,
) {
  const data = {
    preferredRoles: input.preferredRoles,
    preferredCompanies: input.preferredCompanies,
    companyBlacklist: input.companyBlacklist,
    companyWhitelist: input.companyWhitelist,
    industries: input.industries,
    keywords: input.keywords,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    salaryCurrency: input.salaryCurrency,
    remote: input.location.remote,
    hybrid: input.location.hybrid,
    onsite: input.location.onsite,
    countries: input.location.countries,
    states: input.location.states,
    cities: input.location.cities,
    radiusKm: input.location.radiusKm,
    openToRelocation: input.location.openToRelocation,
    openToInternationalRelocation: input.location.openToInternationalRelocation,
    experienceLevel: input.experienceLevel,
    availability: input.availability,
    discoveryFrequency: input.discoveryFrequency,
    notifyInApp: input.notifyInApp,
    preferredCompanySize: input.preferredCompanySize,
    visaSponsorshipRequired: input.visaSponsorshipRequired,
    travelWillingness: input.travelWillingness,
    shiftPreference: input.shiftPreference,
    joiningTimeline: input.joiningTimeline,
    languages: input.languages,
    // Onboarding wizard fields — passed through as-is (not coalesced to a
    // default) so Prisma's "skip undefined keys on update" behavior lets
    // this same upsert stay safe for callers (like the Discovery
    // Preferences panel) that don't know about these fields at all.
    yearsOfExperience: input.yearsOfExperience,
    skills: input.skills,
    educationLevel: input.educationLevel,
    employmentTypes: input.employmentTypes,
    searchPriorities: input.searchPriorities,
    existingJobPortals: input.existingJobPortals,
  };

  return prisma.discoveryPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function upsertConnectorPreference(
  userId: string,
  input: ConnectorPreferenceInput,
) {
  return prisma.connectorPreference.upsert({
    where: { userId_connectorId: { userId, connectorId: input.connectorId } },
    create: {
      userId,
      connectorId: input.connectorId,
      enabled: input.enabled ?? true,
      favorited: input.favorited ?? false,
    },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.favorited !== undefined ? { favorited: input.favorited } : {}),
    },
  });
}

export async function setListingDisposition(
  listingId: string,
  userId: string,
  disposition: DiscoveryDisposition,
) {
  const listing = await getOwnedDiscoveredListingOrThrow(listingId, userId);

  if (disposition === "SAVED" && !listing.savedOpportunityId) {
    const provider = DB_SOURCE_TO_PROVIDER[listing.source];
    if (!provider) {
      // Every `DiscoveredListing` is written by `runDiscovery` from a real
      // connector search result — `source` is never `MANUAL` in practice.
      throw new ValidationError(`Unrecognized discovery source: ${listing.source}.`);
    }

    const opportunity = await saveOpportunity(userId, {
      source: provider,
      sourceId: listing.sourceId,
      type: "JOB",
      title: listing.title,
      companyName: listing.companyName,
      location: listing.location,
      remote: listing.remote,
      employmentType: listing.employmentType,
      salaryMin: listing.salaryMin,
      salaryMax: listing.salaryMax,
      salaryCurrency: listing.salaryCurrency,
      description: listing.description,
      skills: listing.skills as string[],
      applyUrl: listing.applyUrl,
    });

    return prisma.discoveredListing.update({
      where: { id: listingId },
      data: { disposition, savedOpportunityId: opportunity.id },
    });
  }

  return prisma.discoveredListing.update({
    where: { id: listingId },
    data: { disposition },
  });
}

export async function setCompanyDisposition(
  companyId: string,
  userId: string,
  disposition: DiscoveryDisposition,
) {
  await getOwnedDiscoveredCompanyOrThrow(companyId, userId);
  return prisma.discoveredCompany.update({ where: { id: companyId }, data: { disposition } });
}

/** Re-exported so callers building preference summaries don't need to
 * import from `features/location` directly for this one small helper. */
export { encodeCityKey, encodeStateKey };

/** Ownership check reused by the Server Action layer when a discovery
 * action needs to confirm an opportunity (not a discovered listing)
 * belongs to the caller. */
export { getOwnedOpportunityOrThrow };
