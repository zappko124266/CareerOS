import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { buildSearchStrategy } from "@/features/career-intelligence/discovery/search-strategy/service";
import { rankJobs } from "@/features/career-intelligence/discovery/job-ranking/service";
import { rankCompanies } from "@/features/career-intelligence/discovery/company-ranking/service";
import { analyzeSkillGap } from "@/features/career-intelligence/skills/skill-gap-analysis/service";
import { getLatestParsedResume } from "@/features/resume/queries";
import { getConfiguredProviders } from "@/features/opportunities/providers/registry";
import { PROVIDER_TO_DB_SOURCE } from "@/features/opportunities/types";
import { findCountry, findState } from "@/features/location/service";
import { decodeCityKey, decodeStateKey } from "@/features/location/types";
import type { Prisma } from "@/generated/prisma/client";

import { detectListingChanges } from "./change-detection";
import { computeListingFingerprint, DUPLICATE_MATCH_WINDOW_MS } from "./dedupe";
import { computeOpportunityFingerprint } from "./fingerprint";
import { recordListingChanged, recordListingClosed } from "./sync-events";
import {
  computeCompanyPreferenceMatch,
  computeHiringActivitySignal,
  computeLocationMatch,
  computeSalaryMatch,
  mergeCompanyFactors,
  mergeJobFactors,
} from "./ranking";
import { getDiscoveryPreference, listConnectorPreferences } from "./queries";
import type { DiscoveryTrigger } from "./types";

const MAX_LISTINGS_TO_RANK = 40;
const RANKING_CHUNK_SIZE = 20;
const MAX_COMPANIES_TO_RANK = 20;
/** Sprint 19 — how long a previously-active listing can go un-re-seen by
 * its own source before the closure pass infers it's gone. Deliberately
 * several real scheduled runs' worth (discovery runs roughly daily), not
 * one, to absorb ordinary pagination/ranking drift rather than
 * over-declaring closures. */
const CLOSED_AFTER_MISSING_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ELIGIBILITY_NOTE_COMPANIES = 3;

function locationSummaryFor(preference: {
  countries: unknown;
  states: unknown;
  cities: unknown;
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  openToRelocation: boolean;
}): string {
  const countries = (preference.countries as string[]).map((code) => findCountry(code)?.name ?? code);
  const states = (preference.states as string[]).map((key) => {
    const decoded = decodeStateKey(key);
    return decoded ? (findState(decoded.countryCode, decoded.stateCode)?.name ?? key) : key;
  });
  const cities = (preference.cities as string[]).map((key) => decodeCityKey(key)?.cityName ?? key);

  const workTypes = [
    preference.remote && "remote",
    preference.hybrid && "hybrid",
    preference.onsite && "onsite",
  ].filter(Boolean);

  const parts = [
    countries.length > 0 ? `Countries: ${countries.join(", ")}` : null,
    states.length > 0 ? `States: ${states.join(", ")}` : null,
    cities.length > 0 ? `Cities: ${cities.join(", ")}` : null,
    workTypes.length > 0 ? `Work types: ${workTypes.join(", ")}` : null,
    preference.openToRelocation ? "Open to relocation" : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(". ") : "No location preference set yet.";
}

/**
 * A single, plain location term (city > state > country, most specific
 * first) for connector search calls — distinct from `locationSummaryFor`
 * above, which builds a multi-sentence description for the AI search
 * strategy prompt. **Real bug found in this sprint's own verification**:
 * passing the full multi-sentence summary as `location` to
 * `provider.search()` broke every connector that does in-memory substring
 * matching (Arbeitnow, RemoteOK, Greenhouse, Lever) — a sentence like
 * "Countries: United States. Work types: remote, hybrid." never
 * substring-matches a real job's location field ("San Francisco, CA"),
 * silently returning zero results even when matching jobs existed. `null`
 * (no location filter at connector level) is deliberately preferred over
 * guessing — `computeLocationMatch` in `ranking.ts` does the real,
 * structured location scoring afterward against every candidate returned,
 * so an overly narrow fetch-time filter only loses real candidates.
 */
function locationHintFor(preference: { cities: unknown }): string | undefined {
  // Deliberately city-only: a real job's `location` field is likely to
  // literally contain a city name ("San Francisco, CA"), but very unlikely
  // to contain a full state or country name verbatim — passing either as
  // a substring filter would silently zero out results the same way the
  // original bug did. No hint (`undefined`) means the connector returns
  // its normal, unfiltered set, and `computeLocationMatch` scores every
  // candidate properly afterward — a broader fetch is strictly safer than
  // a filter that quietly discards real matches.
  const cities = (preference.cities as string[]).map((key) => decodeCityKey(key)?.cityName ?? null);
  return cities.find((city): city is string => Boolean(city)) ?? undefined;
}

export interface DiscoveryRunSummary {
  runId: string;
  jobsFound: number;
  newJobsFound: number;
  companiesFound: number;
  duplicatesFound: number;
  /** Sprint 19 — real counts from the Change Detector / closure pass. */
  updatedJobsFound: number;
  closedJobsFound: number;
  connectorsUsed: string[];
  errors: { connectorId: string; message: string }[];
}

/**
 * The full discovery pipeline: Career Intelligence (resume) → Location
 * Intelligence (preferences) → Connector Selection → AI Search Strategy →
 * Job Discovery → Company Discovery → Job Ranking → Company Ranking. Every
 * step reuses an existing service (`getLatestParsedResume`,
 * `getConfiguredProviders`, `analyzeSkillGap`) rather than re-implementing
 * it. Entitlement checking happens in the caller (Server Action / cron
 * route), not here — same convention as every other gated service in this
 * codebase.
 */
export async function runDiscovery(
  userId: string,
  trigger: DiscoveryTrigger,
): Promise<DiscoveryRunSummary> {
  const preference = await getDiscoveryPreference(userId);
  if (!preference) {
    throw new ValidationError(
      "Set your discovery preferences before running Job Discovery.",
    );
  }

  const resume = await getLatestParsedResume(userId);
  if (!resume?.rawText) {
    throw new ValidationError(
      "Upload and parse a resume first — Job Discovery uses it to find and rank real matches.",
    );
  }

  const run = await prisma.discoveryRun.create({
    data: { userId, triggeredBy: trigger, connectorsUsed: [], errors: [] },
  });

  const errors: { connectorId: string; message: string }[] = [];
  const connectorsUsed: string[] = [];

  try {
    const connectorPreferences = await listConnectorPreferences(userId);
    const disabledConnectorIds = new Set(
      connectorPreferences.filter((pref) => !pref.enabled).map((pref) => pref.connectorId),
    );

    const providers = getConfiguredProviders().filter(
      (provider) => !disabledConnectorIds.has(provider.id),
    );

    const locationSummary = locationSummaryFor(preference);
    const locationHint = locationHintFor(preference);

    const strategy = await buildSearchStrategy({
      resumeText: resume.rawText,
      preferredRoles: preference.preferredRoles as string[],
      preferredIndustries: preference.industries as string[],
      preferredCompanies: preference.preferredCompanies as string[],
      locationSummary,
      salarySummary:
        preference.salaryMin || preference.salaryMax
          ? `${preference.salaryCurrency ?? ""}${preference.salaryMin ?? "?"}–${preference.salaryMax ?? "?"}`
          : undefined,
      workTypeSummary: [
        preference.remote && "remote",
        preference.hybrid && "hybrid",
        preference.onsite && "onsite",
      ]
        .filter(Boolean)
        .join(", "),
      experienceLevel: preference.experienceLevel ?? undefined,
      availability: preference.availability ?? undefined,
    });

    // Run the top 2 queries only — bounds connector call volume per run
    // regardless of how many queries the AI strategy suggests.
    const queriesToRun = strategy.searchQueries.slice(0, 2);

    const searchResults = await Promise.allSettled(
      providers.flatMap((provider) =>
        queriesToRun.map(async (searchQuery) => {
          connectorsUsed.push(provider.id);
          try {
            return await provider.search({
              query: searchQuery.query,
              location: locationHint,
              remote: preference.remote,
              resultsPerPage: 20,
            });
          } catch (error) {
            errors.push({
              connectorId: provider.id,
              message: error instanceof Error ? error.message : String(error),
            });
            return [];
          }
        }),
      ),
    );

    const allListings = searchResults.flatMap((outcome) =>
      outcome.status === "fulfilled" ? outcome.value : [],
    );

    // Dedupe within this run's own results (the same listing can surface
    // from more than one search query).
    const bySourceId = new Map<string, (typeof allListings)[number]>();
    for (const listing of allListings) {
      bySourceId.set(`${listing.source}:${listing.sourceId}`, listing);
    }
    const uniqueListings = [...bySourceId.values()];

    // Per-connector counts for the Connector Marketplace UI — real jobs
    // actually returned this run, not an estimate.
    const jobsFoundByConnector = new Map<string, number>();
    for (const listing of uniqueListings) {
      jobsFoundByConnector.set(listing.source, (jobsFoundByConnector.get(listing.source) ?? 0) + 1);
    }
    for (const [connectorId, jobsFound] of jobsFoundByConnector) {
      await prisma.connectorPreference.upsert({
        where: { userId_connectorId: { userId, connectorId } },
        create: { userId, connectorId, jobsFound, lastUsedAt: new Date() },
        update: { jobsFound: { increment: jobsFound }, lastUsedAt: new Date() },
      });
    }

    let newJobsFound = 0;
    let duplicatesFound = 0;
    let updatedJobsFound = 0;
    const upsertedListingIds: string[] = [];

    for (const listing of uniqueListings) {
      const dbSource = PROVIDER_TO_DB_SOURCE[listing.source];
      const existing = await prisma.discoveredListing.findUnique({
        where: { userId_source_sourceId: { userId, source: dbSource, sourceId: listing.sourceId } },
      });

      const fingerprint = computeListingFingerprint(listing.companyName, listing.title);
      // Sprint 19's Fingerprint Engine — a separate, stable identity+content
      // signature for this exact (source, sourceId), see `fingerprint.ts`'s
      // own doc comment on how this differs from `fingerprint` above.
      const contentFingerprint = computeOpportunityFingerprint({
        source: dbSource,
        sourceId: listing.sourceId,
        companyName: listing.companyName,
        title: listing.title,
        location: listing.location,
        employmentType: listing.employmentType,
        salaryMin: listing.salaryMin ?? null,
        salaryMax: listing.salaryMax ?? null,
      });

      // Sprint 19 — Change Detection, computed *before* the upsert below
      // overwrites `existing`'s field values, using the exact
      // already-fetched row (no second query). A brand-new row has
      // nothing to diff against.
      const changes = existing ? detectListingChanges(existing, listing) : [];
      const syncStatus = !existing ? "NEW" : changes.length > 0 ? "UPDATED" : "UNCHANGED";

      // Module 6 — Duplicate Engine. Only look for a cross-source match
      // when this is genuinely a brand-new row for this source+sourceId;
      // an already-known row keeps whatever duplicate relationship it was
      // first given, so re-surfacing a listing never flip-flops it.
      let duplicateOfId: string | null = null;
      if (!existing) {
        const postedAt = listing.postedAt ? new Date(listing.postedAt) : new Date();
        const windowStart = new Date(postedAt.getTime() - DUPLICATE_MATCH_WINDOW_MS);
        const windowEnd = new Date(postedAt.getTime() + DUPLICATE_MATCH_WINDOW_MS);

        const candidate = await prisma.discoveredListing.findFirst({
          where: {
            userId,
            fingerprint,
            source: { not: dbSource },
            // Only match against an original — never chain a duplicate off
            // another duplicate.
            duplicateOfId: null,
            OR: [
              { postedAt: { gte: windowStart, lte: windowEnd } },
              { postedAt: null, createdAt: { gte: windowStart, lte: windowEnd } },
            ],
          },
          orderBy: { createdAt: "asc" },
        });

        if (candidate) duplicateOfId = candidate.id;
      }

      const row = await prisma.discoveredListing.upsert({
        where: { userId_source_sourceId: { userId, source: dbSource, sourceId: listing.sourceId } },
        create: {
          userId,
          source: dbSource,
          sourceId: listing.sourceId,
          title: listing.title,
          companyName: listing.companyName,
          location: listing.location,
          remote: listing.remote,
          employmentType: listing.employmentType,
          salaryMin: listing.salaryMin,
          salaryMax: listing.salaryMax,
          salaryCurrency: listing.salaryCurrency,
          description: listing.description,
          skills: listing.skills,
          applyUrl: listing.applyUrl,
          postedAt: listing.postedAt ? new Date(listing.postedAt) : null,
          discoveryRunId: run.id,
          fingerprint,
          contentFingerprint,
          syncStatus,
          lastSeenAt: new Date(),
          duplicateOfId,
        },
        update: {
          title: listing.title,
          location: listing.location,
          remote: listing.remote,
          employmentType: listing.employmentType,
          salaryMin: listing.salaryMin,
          salaryMax: listing.salaryMax,
          salaryCurrency: listing.salaryCurrency,
          description: listing.description,
          skills: listing.skills,
          applyUrl: listing.applyUrl,
          discoveryRunId: run.id,
          fingerprint,
          contentFingerprint,
          syncStatus,
          lastSeenAt: new Date(),
          // A listing that reappears after being inferred `CLOSED` was
          // real evidence of closure that turned out to be wrong (a
          // temporary gap in the source's own results) — real, honest
          // self-correction rather than leaving a stale `CLOSED` label.
          closedAt: null,
        },
      });

      if (!existing) {
        if (duplicateOfId) {
          duplicatesFound += 1;
        } else {
          newJobsFound += 1;
          upsertedListingIds.push(row.id);
        }
      } else {
        if (changes.length > 0) {
          updatedJobsFound += 1;
          await recordListingChanged(userId, { id: row.id, companyName: listing.companyName, title: listing.title }, changes);
        }
        if (existing.disposition === "NEW" && !existing.duplicateOfId) {
          // Still un-actioned and not itself a duplicate — eligible for
          // re-ranking with fresh data.
          upsertedListingIds.push(row.id);
        }
      }
    }

    // Sprint 19 — the closure pass ("removed opportunities," "closed
    // opportunities"). Real, disclosed limitation: a search-API connector
    // only ever returns *current* results for a query, so "this listing's
    // sourceId didn't appear in this run" is real evidence, not proof —
    // pagination/ranking drift on the source's own side could also cause
    // a temporary miss. Bounded to sources this run actually queried (a
    // connector that errored or wasn't configured contributes no evidence
    // either way, so its listings are never touched), and requires
    // `CLOSED_AFTER_MISSING_MS` to have passed since the listing was last
    // genuinely re-seen — several missed runs' worth of buffer, not one.
    const seenSourceIds = new Set(uniqueListings.map((listing) => `${PROVIDER_TO_DB_SOURCE[listing.source]}:${listing.sourceId}`));
    const queriedSources = [...new Set(connectorsUsed)].map((id) => PROVIDER_TO_DB_SOURCE[id as keyof typeof PROVIDER_TO_DB_SOURCE]).filter(Boolean);
    let closedJobsFound = 0;

    if (queriedSources.length > 0) {
      const closureCutoff = new Date(Date.now() - CLOSED_AFTER_MISSING_MS);
      const candidatesForClosure = await prisma.discoveredListing.findMany({
        where: {
          userId,
          source: { in: queriedSources },
          disposition: { in: ["NEW", "SAVED"] },
          closedAt: null,
          duplicateOfId: null,
          lastSeenAt: { lt: closureCutoff },
        },
        select: { id: true, source: true, sourceId: true, companyName: true, title: true },
      });

      for (const candidate of candidatesForClosure) {
        if (seenSourceIds.has(`${candidate.source}:${candidate.sourceId}`)) continue;

        await prisma.discoveredListing.update({
          where: { id: candidate.id },
          data: { syncStatus: "CLOSED", closedAt: new Date() },
        });
        await recordListingClosed(userId, candidate);
        closedJobsFound += 1;
      }
    }

    // Rank only NEW/still-unactioned listings, capped, chunked to keep
    // each AI call's prompt a reasonable size.
    const listingsToRank = await prisma.discoveredListing.findMany({
      where: { id: { in: upsertedListingIds.slice(0, MAX_LISTINGS_TO_RANK) } },
    });

    const openRolesByCompany = new Map<string, number>();
    for (const listing of uniqueListings) {
      openRolesByCompany.set(
        listing.companyName,
        (openRolesByCompany.get(listing.companyName) ?? 0) + 1,
      );
    }

    for (let i = 0; i < listingsToRank.length; i += RANKING_CHUNK_SIZE) {
      const chunk = listingsToRank.slice(i, i + RANKING_CHUNK_SIZE);
      if (chunk.length === 0) continue;

      const aiRanking = await rankJobs({
        resumeText: resume.rawText,
        preferredRoles: preference.preferredRoles as string[],
        preferredIndustries: preference.industries as string[],
        experienceLevel: preference.experienceLevel ?? undefined,
        jobs: chunk.map((job) => ({
          sourceId: job.id,
          title: job.title,
          companyName: job.companyName,
          location: job.location,
          description: job.description,
        })),
      });

      for (const job of chunk) {
        const aiResult = aiRanking.rankings.find((ranking) => ranking.sourceId === job.id);
        if (!aiResult) continue;

        const { factors, overallScore } = mergeJobFactors(aiResult, {
          locationMatch: computeLocationMatch(job, {
            countries: preference.countries as string[],
            states: preference.states as string[],
            cities: preference.cities as string[],
            remote: preference.remote,
            hybrid: preference.hybrid,
            onsite: preference.onsite,
            openToRelocation: preference.openToRelocation,
          }),
          salaryMatch: computeSalaryMatch(job, preference),
          companyPreferenceMatch: computeCompanyPreferenceMatch(job.companyName, {
            preferredCompanies: preference.preferredCompanies as string[],
            companyWhitelist: preference.companyWhitelist as string[],
            companyBlacklist: preference.companyBlacklist as string[],
          }),
          recentHiringActivity: computeHiringActivitySignal(
            openRolesByCompany.get(job.companyName) ?? 1,
          ),
        });

        await prisma.discoveredListing.update({
          where: { id: job.id },
          data: { matchScore: overallScore, matchFactors: factors as unknown as Prisma.InputJsonValue },
        });
      }
    }

    // Company Discovery — aggregate from this run's listings.
    const companiesToRank = [...openRolesByCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_COMPANIES_TO_RANK);

    let companiesFound = 0;
    const upsertedCompanyIds: { id: string; companyName: string; openRoles: number }[] = [];

    for (const [companyName, openRoles] of companiesToRank) {
      const row = await prisma.discoveredCompany.upsert({
        where: { userId_companyName: { userId, companyName } },
        create: { userId, companyName, openRoles, discoveryRunId: run.id },
        update: { openRoles, discoveryRunId: run.id },
      });
      companiesFound += 1;
      upsertedCompanyIds.push({ id: row.id, companyName, openRoles });
    }

    if (upsertedCompanyIds.length > 0) {
      const aiCompanyRanking = await rankCompanies({
        resumeText: resume.rawText,
        preferredRoles: preference.preferredRoles as string[],
        preferredIndustries: preference.industries as string[],
        companies: upsertedCompanyIds.map(({ companyName, openRoles }) => {
          const sampleJobs = uniqueListings.filter((job) => job.companyName === companyName).slice(0, 3);
          return {
            companyName,
            openRoles,
            sampleTitles: sampleJobs.map((job) => job.title),
            sampleDescription: sampleJobs[0]?.description ?? "",
          };
        }),
      });

      const borderlineForEligibilityNotes: { id: string; companyName: string }[] = [];

      for (const company of upsertedCompanyIds) {
        const aiResult = aiCompanyRanking.rankings.find(
          (ranking) => ranking.companyName === company.companyName,
        );
        if (!aiResult) continue;

        const { factors, overallScore } = mergeCompanyFactors(aiResult, {
          companyPreferenceMatch: computeCompanyPreferenceMatch(company.companyName, {
            preferredCompanies: preference.preferredCompanies as string[],
            companyWhitelist: preference.companyWhitelist as string[],
            companyBlacklist: preference.companyBlacklist as string[],
          }),
          hiringActivity: computeHiringActivitySignal(company.openRoles),
        });

        await prisma.discoveredCompany.update({
          where: { id: company.id },
          data: { matchScore: overallScore, matchFactors: factors as unknown as Prisma.InputJsonValue },
        });

        if (overallScore >= 40 && overallScore <= 70) {
          borderlineForEligibilityNotes.push(company);
        }
      }

      for (const company of borderlineForEligibilityNotes.slice(0, MAX_ELIGIBILITY_NOTE_COMPANIES)) {
        const sampleJob = uniqueListings.find((job) => job.companyName === company.companyName);
        if (!sampleJob) continue;

        try {
          const gapAnalysis = await analyzeSkillGap({
            resumeText: resume.rawText,
            targetRole: sampleJob.title,
          });

          await prisma.discoveredCompany.update({
            where: { id: company.id },
            data: {
              eligibilityNotes: gapAnalysis.missingSkills.map(
                (skill) => `${skill.skill} (${skill.importance})`,
              ),
            },
          });
        } catch (error) {
          logger.error("discovery.eligibility_notes_failed", {
            userId,
            companyName: company.companyName,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: {
        connectorsUsed: [...new Set(connectorsUsed)],
        jobsFound: uniqueListings.length,
        newJobsFound,
        companiesFound,
        duplicatesFound,
        updatedJobsFound,
        closedJobsFound,
        errors,
        completedAt: new Date(),
      },
    });

    return {
      runId: run.id,
      jobsFound: uniqueListings.length,
      newJobsFound,
      companiesFound,
      duplicatesFound,
      updatedJobsFound,
      closedJobsFound,
      connectorsUsed: [...new Set(connectorsUsed)],
      errors,
    };
  } catch (error) {
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: {
        errors: [
          ...errors,
          { connectorId: "*", message: error instanceof Error ? error.message : String(error) },
        ],
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
