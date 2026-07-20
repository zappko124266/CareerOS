import { z } from "zod";

import { LocationPreferenceInputSchema } from "@/features/location/schema";

/** Mirrors the Prisma enums of the same name — independent literal lists,
 * same convention as `OpportunityStatus` elsewhere in this codebase. */
export const ExperienceLevelSchema = z.enum(["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"]);
export const AvailabilityWindowSchema = z.enum([
  "IMMEDIATE",
  "TWO_WEEKS",
  "ONE_MONTH",
  "FLEXIBLE",
  "NOT_LOOKING",
]);
export const DiscoveryFrequencySchema = z.enum(["HOURLY", "DAILY", "WEEKLY", "MANUAL_ONLY"]);
export const DiscoveryDispositionSchema = z.enum(["NEW", "SAVED", "HIDDEN", "REJECTED"]);
export const DiscoveryTriggerSchema = z.enum(["MANUAL", "SCHEDULED"]);

export const DiscoveryPreferenceInputSchema = z.object({
  preferredRoles: z.array(z.string().trim().min(1)).max(20),
  preferredCompanies: z.array(z.string().trim().min(1)).max(50),
  companyBlacklist: z.array(z.string().trim().min(1)).max(50),
  companyWhitelist: z.array(z.string().trim().min(1)).max(50),
  industries: z.array(z.string().trim().min(1)).max(20),
  keywords: z.array(z.string().trim().min(1)).max(30),
  salaryMin: z.number().int().min(0).nullable(),
  salaryMax: z.number().int().min(0).nullable(),
  salaryCurrency: z.string().max(10).nullable(),
  location: LocationPreferenceInputSchema,
  experienceLevel: ExperienceLevelSchema.nullable(),
  availability: AvailabilityWindowSchema.nullable(),
  discoveryFrequency: DiscoveryFrequencySchema,
  notifyInApp: z.boolean(),
  /// New this sprint (Module 4) — same "free text, never a fabricated
  /// enum" convention as `Company.sizeEstimate`.
  preferredCompanySize: z.string().trim().max(100).nullable(),
  visaSponsorshipRequired: z.boolean().nullable(),
  travelWillingness: z.string().trim().max(100).nullable(),
  shiftPreference: z.string().trim().max(100).nullable(),
  joiningTimeline: z.string().trim().max(100).nullable(),
  languages: z.array(z.string().trim().min(1)).max(20),
});

export const ConnectorPreferenceInputSchema = z.object({
  connectorId: z.string().min(1),
  enabled: z.boolean().optional(),
  favorited: z.boolean().optional(),
});

export const SetListingDispositionInputSchema = z.object({
  listingId: z.uuid(),
  disposition: DiscoveryDispositionSchema,
});

export const SetCompanyDispositionInputSchema = z.object({
  companyId: z.uuid(),
  disposition: DiscoveryDispositionSchema,
});
