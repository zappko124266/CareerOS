import "server-only";

import { env } from "@/lib/env.server";

import {
  OpportunityProviderNotConfiguredError,
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType } from "./normalize";

interface UsaJobsRemuneration {
  MinimumRange?: string;
  MaximumRange?: string;
  RateIntervalCode?: string;
}

interface UsaJobsSearchItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName?: string;
    PositionLocationDisplay?: string;
    PositionRemuneration?: UsaJobsRemuneration[];
    QualificationSummary?: string;
    PositionURI: string;
    PublicationStartDate?: string;
    PositionSchedule?: { Name?: string }[];
  };
}

interface UsaJobsResponse {
  SearchResult: { SearchResultItems: UsaJobsSearchItem[] };
}

function isConfigured() {
  return Boolean(env.USAJOBS_API_KEY && env.USAJOBS_USER_AGENT);
}

/** The U.S. federal government's own official job board API — built for
 * exactly this kind of programmatic search, not a scraper. */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  if (!isConfigured()) {
    throw new OpportunityProviderNotConfiguredError(
      "USAJobs isn't configured — set USAJOBS_API_KEY and USAJOBS_USER_AGENT.",
    );
  }

  const url = new URL("https://data.usajobs.gov/api/search");
  if (params.query) url.searchParams.set("Keyword", params.query);
  if (params.location) url.searchParams.set("LocationName", params.location);
  url.searchParams.set("ResultsPerPage", String(params.resultsPerPage ?? 20));
  url.searchParams.set("Page", String(params.page ?? 1));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": env.USAJOBS_USER_AGENT!,
        "Authorization-Key": env.USAJOBS_API_KEY!,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError("Couldn't reach USAJobs.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `USAJobs returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as UsaJobsResponse;

  return data.SearchResult.SearchResultItems.map((item): NormalizedOpportunity => {
    const descriptor = item.MatchedObjectDescriptor;
    const description = descriptor.QualificationSummary ?? "";
    const remuneration = descriptor.PositionRemuneration?.[0];

    return {
      source: "usajobs",
      sourceId: item.MatchedObjectId,
      type: guessOpportunityType(descriptor.PositionTitle, description),
      title: descriptor.PositionTitle,
      companyName: descriptor.OrganizationName ?? "U.S. Government",
      location: descriptor.PositionLocationDisplay ?? null,
      remote: /remote/i.test(descriptor.PositionLocationDisplay ?? ""),
      employmentType: descriptor.PositionSchedule?.[0]?.Name ?? null,
      salaryMin: remuneration?.MinimumRange ? Math.round(Number(remuneration.MinimumRange)) : null,
      salaryMax: remuneration?.MaximumRange ? Math.round(Number(remuneration.MaximumRange)) : null,
      salaryCurrency: remuneration ? "USD" : null,
      description,
      skills: [],
      applyUrl: descriptor.PositionURI,
      postedAt: descriptor.PublicationStartDate ?? null,
    };
  });
}

export const usajobsProvider: OpportunityProviderAdapter = {
  id: "usajobs",
  name: "USAJobs",
  isConfigured,
  search,
};
