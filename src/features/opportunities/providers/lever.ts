import "server-only";

import { env } from "@/lib/env.server";

import {
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType, stripHtml } from "./normalize";

// Same rationale as Greenhouse's DEFAULT_BOARD_TOKENS — Lever has no
// directory API, so a small seed list of real, publicly known Lever
// customers is the honest default; extend via LEVER_COMPANY_TOKENS.
// Verified live against Lever's API during this sprint's own testing
// (spotify and ro both returned real, current postings; netflix returns a
// valid empty board rather than an error, which is a legitimate outcome
// worth keeping as an example of that case).
const DEFAULT_COMPANY_TOKENS = ["spotify", "ro", "netflix"];

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string };
  descriptionPlain?: string;
}

function companyTokens(): string[] {
  const configured = env.LEVER_COMPANY_TOKENS?.split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_COMPANY_TOKENS;
}

/** Public API — no key required, always "configured". */
function isConfigured() {
  return true;
}

async function fetchCompany(token: string): Promise<NormalizedOpportunity[]> {
  // Same rationale as Greenhouse's fetch — full posting descriptions from
  // a large company routinely exceed Next.js's 2MB data-cache entry limit.
  const response = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`company "${token}" returned ${response.status}`);
  }

  const postings = (await response.json()) as LeverPosting[];

  return postings.map((posting): NormalizedOpportunity => {
    const description = stripHtml(posting.descriptionPlain ?? "");
    const location = posting.categories?.location ?? null;

    return {
      source: "lever",
      sourceId: posting.id,
      type: guessOpportunityType(posting.text, description),
      title: posting.text,
      companyName: token,
      location,
      remote: /remote/i.test(`${location ?? ""} ${posting.text}`),
      employmentType: posting.categories?.commitment ?? null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      description,
      skills: [],
      applyUrl: posting.hostedUrl,
      postedAt: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
    };
  });
}

/** Same fan-out-and-filter pattern as Greenhouse — Lever's public API is
 * per-company, with no cross-company search endpoint. */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  const tokens = companyTokens();
  const settled = await Promise.allSettled(tokens.map(fetchCompany));

  const normalized: NormalizedOpportunity[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") normalized.push(...outcome.value);
  }

  if (normalized.length === 0 && settled.every((outcome) => outcome.status === "rejected")) {
    throw new OpportunityProviderRequestFailedError("Couldn't reach any configured Lever companies.");
  }

  const query = params.query?.toLowerCase().trim();
  const location = params.location?.toLowerCase().trim();

  return normalized
    .filter((job) => {
      if (query) {
        const haystack = `${job.title} ${job.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (location && !job.location?.toLowerCase().includes(location)) return false;
      if (params.remote && !job.remote) return false;
      return true;
    })
    .slice(0, params.resultsPerPage ?? 20);
}

export const leverProvider: OpportunityProviderAdapter = {
  id: "lever",
  name: "Lever-hosted careers",
  isConfigured,
  search,
};
