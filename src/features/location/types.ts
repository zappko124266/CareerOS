import type { z } from "zod";

import type {
  LocationPreferenceInputSchema,
  LocationSelectionSchema,
  WorkTypePreferenceSchema,
} from "./schema";

export type LocationSelection = z.infer<typeof LocationSelectionSchema>;
export type WorkTypePreference = z.infer<typeof WorkTypePreferenceSchema>;
export type LocationPreferenceInput = z.infer<typeof LocationPreferenceInputSchema>;

/** `DiscoveryPreference.states`/`.cities` store composite keys
 * (`"countryCode:stateCode"`, `"countryCode:stateCode:cityName"`) rather
 * than three arrays that would need to stay in sync by array index —
 * these two functions are the only place that encoding is built or read. */
export function encodeStateKey(countryCode: string, stateCode: string): string {
  return `${countryCode}:${stateCode}`;
}

export function encodeCityKey(
  countryCode: string,
  stateCode: string,
  cityName: string,
): string {
  return `${countryCode}:${stateCode}:${cityName}`;
}

export function decodeStateKey(key: string): { countryCode: string; stateCode: string } | null {
  const [countryCode, stateCode] = key.split(":");
  if (!countryCode || !stateCode) return null;
  return { countryCode, stateCode };
}

export function decodeCityKey(
  key: string,
): { countryCode: string; stateCode: string; cityName: string } | null {
  const [countryCode, stateCode, ...rest] = key.split(":");
  const cityName = rest.join(":");
  if (!countryCode || !stateCode || !cityName) return null;
  return { countryCode, stateCode, cityName };
}
