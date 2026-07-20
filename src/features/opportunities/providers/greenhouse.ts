import "server-only";

import { env } from "@/lib/env.server";

import {
  OpportunityProviderRequestFailedError,
  type NormalizedOpportunity,
  type OpportunityProviderAdapter,
  type OpportunitySearchParams,
} from "./types";
import { guessOpportunityType, stripHtml } from "./normalize";

// Real, publicly known companies hosting their careers page on Greenhouse
// — used only as the default when GREENHOUSE_BOARD_TOKENS isn't set, so
// the connector works out of the box. Greenhouse has no directory API of
// "every company using Greenhouse," so some seed list is unavoidable;
// extend it via the env var, not by editing this file. Verified live
// against Greenhouse's API during this sprint's own testing — each
// returned 100+ real, current postings.
const DEFAULT_BOARD_TOKENS = ["stripe", "airbnb", "gitlab", "figma", "instacart"];

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

function boardTokens(): string[] {
  const configured = env.GREENHOUSE_BOARD_TOKENS?.split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  return configured && configured.length > 0 ? configured : DEFAULT_BOARD_TOKENS;
}

/** Public API — no key required, always "configured". */
function isConfigured() {
  return true;
}

async function fetchBoard(token: string): Promise<NormalizedOpportunity[]> {
  // `content=true` returns full HTML job descriptions — large company
  // boards routinely exceed Next.js's 2MB data-cache entry limit (observed
  // directly in this sprint's own verification), so `next.revalidate`
  // would just fail to cache on every request and log a warning for no
  // benefit. `no-store` is the honest choice here, not a caching hint that
  // silently never applies.
  const response = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(`board "${token}" returned ${response.status}`);
  }

  const data = (await response.json()) as GreenhouseResponse;

  return data.jobs.map((job): NormalizedOpportunity => {
    const description = stripHtml(job.content ?? "");
    const location = job.location?.name ?? null;

    return {
      source: "greenhouse",
      sourceId: `${token}:${job.id}`,
      type: guessOpportunityType(job.title, description),
      title: job.title,
      companyName: token,
      location,
      remote: /remote/i.test(`${location ?? ""} ${job.title}`),
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      description,
      skills: [],
      applyUrl: job.absolute_url,
      postedAt: job.updated_at ?? null,
    };
  });
}

/**
 * Fans out across a curated list of Greenhouse-hosted company boards
 * (Greenhouse has no "search across every company" endpoint — each
 * company's board is its own independent public API) and filters
 * in-memory, same pattern as Arbeitnow's whole-board-then-filter
 * approach. One board failing never fails the whole search.
 */
async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  const tokens = boardTokens();
  const settled = await Promise.allSettled(tokens.map(fetchBoard));

  const normalized: NormalizedOpportunity[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") normalized.push(...outcome.value);
  }

  if (normalized.length === 0 && settled.every((outcome) => outcome.status === "rejected")) {
    throw new OpportunityProviderRequestFailedError("Couldn't reach any configured Greenhouse boards.");
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

export const greenhouseProvider: OpportunityProviderAdapter = {
  id: "greenhouse",
  name: "Greenhouse-hosted careers",
  isConfigured,
  search,
};
