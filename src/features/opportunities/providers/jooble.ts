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

interface JoobleJob {
  id: string | number;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
}

interface JoobleResponse {
  totalCount: number;
  jobs: JoobleJob[];
}

function isConfigured() {
  return Boolean(env.JOOBLE_API_KEY);
}

/** Jooble's `salary` field is free text (e.g. "$50,000 - $70,000 a year"),
 * not structured data. Only extract a min/max when the string
 * unambiguously matches a "<number> - <number>" pattern — anything else is
 * left null rather than guessed, so an unparsed string never turns into a
 * confidently-wrong number. */
function parseSalaryRange(
  raw: string | undefined,
): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };

  const match = raw
    .replace(/,/g, "")
    .match(/(\d{4,})\s*-\s*(\d{4,})/);

  if (!match) return { min: null, max: null };

  return { min: Number(match[1]), max: Number(match[2]) };
}

async function search(
  params: OpportunitySearchParams,
): Promise<NormalizedOpportunity[]> {
  if (!isConfigured()) {
    throw new OpportunityProviderNotConfiguredError(
      "Jooble isn't configured — set JOOBLE_API_KEY.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`https://jooble.org/api/${env.JOOBLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: params.query ?? "",
        location: params.location ?? "",
        salary: params.salaryMin,
        page: params.page ?? 1,
        ResultOnPage: params.resultsPerPage ?? 20,
      }),
      next: { revalidate: 300 },
    });
  } catch (error) {
    throw new OpportunityProviderRequestFailedError(
      "Couldn't reach Jooble.",
      { cause: error },
    );
  }

  if (!response.ok) {
    throw new OpportunityProviderRequestFailedError(
      `Jooble returned an unexpected response (${response.status}).`,
    );
  }

  const data = (await response.json()) as JoobleResponse;

  return data.jobs.map((job): NormalizedOpportunity => {
    const description = stripHtml(job.snippet ?? "");
    const { min, max } = parseSalaryRange(job.salary);

    return {
      source: "jooble",
      sourceId: String(job.id),
      type: guessOpportunityType(job.title, description),
      title: job.title,
      companyName: job.company ?? "Unknown company",
      location: job.location ?? null,
      remote: /remote/i.test(`${job.location ?? ""} ${job.title}`),
      employmentType: job.type ?? null,
      salaryMin: min,
      salaryMax: max,
      salaryCurrency: min !== null || max !== null ? "USD" : null,
      description,
      skills: [],
      applyUrl: job.link,
      postedAt: job.updated ?? null,
    };
  });
}

export const joobleProvider: OpportunityProviderAdapter = {
  id: "jooble",
  name: "Jooble",
  isConfigured,
  search,
};
