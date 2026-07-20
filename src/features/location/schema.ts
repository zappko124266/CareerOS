import { z } from "zod";

/** A composite location selection — always a country ISO code, optionally
 * narrowed by state and city. Stored as this same composite shape in
 * `DiscoveryPreference.countries/states/cities` (as plain strings, see
 * `types.ts`'s `encodeLocationKey`/`decodeLocationKey`) rather than three
 * separate parallel arrays that could drift out of sync with each other. */
export const LocationSelectionSchema = z.object({
  countryCode: z.string().length(2),
  stateCode: z.string().optional(),
  cityName: z.string().optional(),
});

export const WorkTypePreferenceSchema = z.object({
  remote: z.boolean(),
  hybrid: z.boolean(),
  onsite: z.boolean(),
});

export const LocationPreferenceInputSchema = z.object({
  countries: z.array(z.string().length(2)).max(20),
  states: z.array(z.string()).max(50),
  cities: z.array(z.string()).max(100),
  remote: z.boolean(),
  hybrid: z.boolean(),
  onsite: z.boolean(),
  radiusKm: z.number().int().min(0).max(500).nullable(),
  openToRelocation: z.boolean(),
  openToInternationalRelocation: z.boolean(),
});
