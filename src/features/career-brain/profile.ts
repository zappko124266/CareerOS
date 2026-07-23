import { buildLocationSummary } from "@/features/discovery/types";
import type { CareerGoal, DiscoveryPreference } from "@/generated/prisma/client";

import type { CareerProfile } from "./types";

/**
 * Career Profile builder — a pure reshape of the onboarding
 * `DiscoveryPreference`/`CareerGoal` rows plus the parsed resume's
 * skills/title, already fetched by `getCareerBrain`. No new fields, no
 * new computation beyond the existing `buildLocationSummary` helper
 * (`features/discovery/types.ts`) every other feature already uses.
 */
export function buildCareerProfile(input: {
  skills: string[];
  currentTitle: string | null;
  preference: DiscoveryPreference | null;
  careerGoal: CareerGoal | null;
}): CareerProfile {
  const { skills, currentTitle, preference, careerGoal } = input;

  return {
    skills,
    currentTitle,
    yearsOfExperience: preference?.yearsOfExperience ?? null,
    educationLevel: preference?.educationLevel ?? null,
    careerStage: (preference?.experienceLevel as CareerProfile["careerStage"]) ?? null,
    goals: {
      targetRole: careerGoal?.targetRole ?? null,
      targetTimeline: careerGoal?.targetTimeline ?? null,
      targetCompanies: Array.isArray(careerGoal?.targetCompanies)
        ? (careerGoal.targetCompanies as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
      targetSalaryMin: careerGoal?.targetSalaryMin ?? null,
      targetSalaryMax: careerGoal?.targetSalaryMax ?? null,
      targetLocation: careerGoal?.targetLocation ?? null,
    },
    preferences: {
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
      salaryMin: preference?.salaryMin ?? null,
      salaryMax: preference?.salaryMax ?? null,
      employmentTypes: (preference?.employmentTypes as CareerProfile["preferences"]["employmentTypes"]) ?? [],
      searchPriorities: (preference?.searchPriorities as CareerProfile["preferences"]["searchPriorities"]) ?? [],
      existingJobPortals: (preference?.existingJobPortals as string[]) ?? [],
      urgency: (preference?.availability as CareerProfile["preferences"]["urgency"]) ?? null,
    },
  };
}
