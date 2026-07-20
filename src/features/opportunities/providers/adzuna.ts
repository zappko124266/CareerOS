import "server-only";

import { env } from "@/lib/env.server";

import {
  OpportunityProviderNotConfiguredError,
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType, stripHtml } from "./normalize";

// Adzuna requires a country in the URL path (it's a per-country index, not
// a single global one). US is the sane default for this app; revisit if
// CareerOS ever needs multi-country search — see
// https://developer.adzuna.com/docs/search for the full country list.
const ADZUNA_COUNTRY = "us";

interface AdzunaJob {
  id: string | number;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  description?: string;
  redirect_url: string;
  created?: string;
  contract_type?: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

function isConfigured() {
  return Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY);
}

async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  if (!isConfigured()) {
    throw new OpportunityProviderNotConfiguredError(
      "Adzuna isn't configured — set ADZUNA_APP_ID and ADZUNA_APP_KEY.",
    );
  }

  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${params.page ?? 1}`,
  );
  url.searchParams.set("app_id", env.ADZUNA_APP_ID!);
  url.searchParams.set("app_key", env.ADZUNA_APP_KEY!);
  url.searchParams.set("content-type", "application/json");
  if (params.query) url.searchParams.set("what", params.query);
  if (params.location) url.searchParams.set("where", params.location);
  if (params.salaryMin) {
    url.searchParams.set("salary_min", String(params.salaryMin));
  }
  url.searchParams.set(
    "results_per_page",
    String(params.resultsPerPage ?? 20),
  );

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 300 } });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError(
      "Couldn't reach Adzuna.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `Adzuna returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as AdzunaResponse;

  return data.results.map((job): NormalizedOpportunity => {
    const location = job.location?.display_name ?? null;
    const description = stripHtml(job.description ?? "");

    return {
      source: "adzuna",
      sourceId: String(job.id),
      type: guessOpportunityType(job.title, description),
      title: job.title,
      companyName: job.company?.display_name ?? "Unknown company",
      location,
      remote: /remote/i.test(`${location ?? ""} ${job.title}`),
      employmentType: job.contract_type ?? null,
      salaryMin: job.salary_min ? Math.round(job.salary_min) : null,
      salaryMax: job.salary_max ? Math.round(job.salary_max) : null,
      salaryCurrency: job.salary_min || job.salary_max ? "USD" : null,
      description,
      skills: [],
      applyUrl: job.redirect_url,
      postedAt: job.created ?? null,
    };
  });
}

export const adzunaProvider: OpportunityProviderAdapter = {
  id: "adzuna",
  name: "Adzuna",
  isConfigured,
  search,
};
