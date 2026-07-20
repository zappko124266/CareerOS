import "server-only";

import {
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType, stripHtml } from "./normalize";

interface RemoteOkJob {
  id?: string;
  slug?: string;
  position?: string;
  company?: string;
  description?: string;
  location?: string;
  tags?: string[];
  apply_url?: string;
  url?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
  /** Only present on the first array element, which is a legal/metadata
   * notice, not a job — this field is how we detect and skip it. */
  legal?: string;
}

/** Public API — no key required, always "configured". */
function isConfigured() {
  return true;
}

/** RemoteOK returns its current firehose in one response, first element a
 * non-job legal notice — filtering happens here, in memory, same rationale
 * as Arbeitnow's adapter. Every listing is remote by definition. */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  let response: Response;
  try {
    response = await fetch("https://remoteok.com/api", {
      headers: {
        Accept: "application/json",
        // RemoteOK blocks requests with no User-Agent.
        "User-Agent": "CareerOS Job Discovery (+https://careeros.app)",
      },
      next: { revalidate: 300 },
    });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError(
      "Couldn't reach RemoteOK.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `RemoteOK returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as RemoteOkJob[];

  const normalized = data
    .filter((job): job is Required<Pick<RemoteOkJob, "id" | "position">> & RemoteOkJob =>
      Boolean(job.id && job.position && !job.legal),
    )
    .map((job): NormalizedOpportunity => {
      const description = stripHtml(job.description ?? "");
      return {
        source: "remoteok",
        sourceId: job.id,
        type: guessOpportunityType(job.position, description),
        title: job.position,
        companyName: job.company ?? "Unknown company",
        location: job.location || "Remote",
        remote: true,
        employmentType: null,
        salaryMin: job.salary_min || null,
        salaryMax: job.salary_max || null,
        salaryCurrency: job.salary_min || job.salary_max ? "USD" : null,
        description,
        skills: job.tags ?? [],
        applyUrl: job.apply_url || job.url || "",
        postedAt: job.date ?? null,
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
      if (location && location !== "remote") {
        if (!job.location?.toLowerCase().includes(location)) return false;
      }
      return true;
    })
    .slice(0, params.resultsPerPage ?? 20);
}

export const remoteokProvider: OpportunityProviderAdapter = {
  id: "remoteok",
  name: "RemoteOK",
  isConfigured,
  search,
};
