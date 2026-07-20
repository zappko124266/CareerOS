import "server-only";

import {
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType, stripHtml } from "./normalize";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number | string;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
}

/** Public API — no key required, always "configured". */
function isConfigured() {
  return true;
}

/** Arbeitnow returns its whole current board in one response rather than
 * accepting server-side query params — filtering happens here, in memory,
 * instead of pretending the provider supports something it doesn't. */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  let response: Response;
  try {
    response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError(
      "Couldn't reach Arbeitnow.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `Arbeitnow returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as ArbeitnowResponse;

  const normalized = data.data.map((job): NormalizedOpportunity => {
    const description = stripHtml(job.description ?? "");
    const createdAt =
      typeof job.created_at === "number"
        ? new Date(job.created_at * 1000).toISOString()
        : (job.created_at ?? null);

    return {
      source: "arbeitnow",
      sourceId: job.slug,
      type: guessOpportunityType(job.title, description),
      title: job.title,
      companyName: job.company_name,
      location: job.location || null,
      remote: Boolean(job.remote),
      employmentType: job.job_types?.[0] ?? null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      description,
      skills: job.tags ?? [],
      applyUrl: job.url,
      postedAt: createdAt,
    };
  });

  const query = params.query?.toLowerCase().trim();
  const location = params.location?.toLowerCase().trim();

  return normalized
    .filter((job) => {
      if (query) {
        const haystack = `${job.title} ${job.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (location) {
        if (!job.location?.toLowerCase().includes(location)) return false;
      }
      if (params.remote && !job.remote) return false;
      return true;
    })
    .slice(0, params.resultsPerPage ?? 20);
}

export const arbeitnowProvider: OpportunityProviderAdapter = {
  id: "arbeitnow",
  name: "Arbeitnow",
  isConfigured,
  search,
};
