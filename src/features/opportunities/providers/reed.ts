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

interface ReedJob {
  jobId: number;
  employerName: string;
  jobTitle: string;
  locationName?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string;
  jobDescription?: string;
  date?: string;
  jobUrl: string;
  contractType?: string;
}

interface ReedResponse {
  results: ReedJob[];
}

function isConfigured() {
  return Boolean(env.REED_API_KEY);
}

/** Reed's official public API — HTTP Basic auth with the API key as the
 * username and an empty password, per Reed's own documentation. */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  if (!isConfigured()) {
    throw new OpportunityProviderNotConfiguredError(
      "Reed isn't configured — set REED_API_KEY.",
    );
  }

  const url = new URL("https://www.reed.co.uk/api/1.0/search");
  if (params.query) url.searchParams.set("keywords", params.query);
  if (params.location) url.searchParams.set("locationName", params.location);
  url.searchParams.set("resultsToTake", String(params.resultsPerPage ?? 20));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.REED_API_KEY!}:`).toString("base64")}`,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError("Couldn't reach Reed.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `Reed returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as ReedResponse;

  return data.results.map((job): NormalizedOpportunity => {
    const description = job.jobDescription ?? "";

    return {
      source: "reed",
      sourceId: String(job.jobId),
      type: guessOpportunityType(job.jobTitle, description),
      title: job.jobTitle,
      companyName: job.employerName,
      location: job.locationName ?? null,
      remote: /remote/i.test(`${job.locationName ?? ""} ${job.jobTitle}`),
      employmentType: job.contractType ?? null,
      salaryMin: job.minimumSalary ? Math.round(job.minimumSalary) : null,
      salaryMax: job.maximumSalary ? Math.round(job.maximumSalary) : null,
      salaryCurrency: job.currency ?? (job.minimumSalary ? "GBP" : null),
      description,
      skills: [],
      applyUrl: job.jobUrl,
      postedAt: job.date ?? null,
    };
  });
}

export const reedProvider: OpportunityProviderAdapter = {
  id: "reed",
  name: "Reed",
  isConfigured,
  search,
};
