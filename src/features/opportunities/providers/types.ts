import { AppError } from "@/lib/errors";

/**
 * Registered connector ids. Adding a new provider is: (1) add a file under
 * `providers/`, (2) register it in `registry.ts`'s `PROVIDER_REGISTRY`,
 * (3) add its id here. Nothing in `service.ts` or any caller of
 * `searchOpportunities` needs to change — the same shape this codebase
 * already uses for the AI Router (`src/lib/ai/router.ts`).
 */
export const OPPORTUNITY_PROVIDER_IDS = [
  "adzuna",
  "jooble",
  "arbeitnow",
  "remoteok",
  "greenhouse",
  "lever",
  "usajobs",
  "reed",
] as const;
export type OpportunityProviderId = (typeof OPPORTUNITY_PROVIDER_IDS)[number];

export interface OpportunitySearchParams {
  query?: string;
  location?: string;
  remote?: boolean;
  salaryMin?: number;
  /** Best-effort per provider — not every source can filter server-side by
   * this, in which case the adapter passes it through unfiltered and the
   * service layer's own normalization is what the UI actually relies on. */
  employmentType?: string;
  page?: number;
  resultsPerPage?: number;
}

/**
 * The one shape every connector normalizes its provider's response into.
 * Nothing downstream of a provider adapter (`service.ts`, match scoring,
 * the UI) ever sees a provider-specific field name.
 */
export interface NormalizedOpportunity {
  source: OpportunityProviderId;
  sourceId: string;
  type: "JOB" | "INTERNSHIP" | "CONTRACT" | "FREELANCE" | "CAMPUS";
  title: string;
  companyName: string;
  location: string | null;
  remote: boolean;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string;
  skills: string[];
  applyUrl: string;
  /** ISO 8601, or null if the provider doesn't report one. Never guessed. */
  postedAt: string | null;
}

/**
 * Contract every `providers/*.ts` file implements. `search()` must throw
 * `OpportunityProviderNotConfiguredError` (not return `[]`) when
 * unconfigured, so the service layer can tell "this provider has nothing
 * to show" apart from "this provider isn't set up" — the empty-state copy
 * differs for each.
 */
export interface OpportunityProviderAdapter {
  readonly id: OpportunityProviderId;
  readonly name: string;
  isConfigured(): boolean;
  search(params: OpportunitySearchParams): Promise<NormalizedOpportunity[]>;
}

/** Base class for all opportunity-provider errors. See `src/lib/errors.ts` for the shared `AppError` contract. */
export class OpportunityProviderError extends AppError {}

/** The provider's required credentials (API key, etc.) aren't configured. */
export class OpportunityProviderNotConfiguredError extends OpportunityProviderError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("OPPORTUNITY_PROVIDER_NOT_CONFIGURED", message, options);
    this.name = "OpportunityProviderNotConfiguredError";
  }
}

/** The provider was reached but the request failed (bad response, network error, etc.). */
export class OpportunityProviderRequestFailedError extends OpportunityProviderError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("OPPORTUNITY_PROVIDER_REQUEST_FAILED", message, options);
    this.name = "OpportunityProviderRequestFailedError";
  }
}
