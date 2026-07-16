import type { LanguageModel } from "ai";
import type { ZodType } from "zod";

import { AppError } from "@/lib/errors";

/**
 * Registered provider ids. Adding a new provider is: (1) add a file under
 * `providers/`, (2) register it in `router.ts`'s `PROVIDER_REGISTRY`,
 * (3) add its id here. `index.ts` and every caller of `generateText` /
 * `generateObject` / `streamText` never need to change.
 */
export const AI_PROVIDER_IDS = [
  "nvidia",
  "groq",
  "gemini",
  "openrouter",
] as const;
export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

/**
 * Contract every `providers/*.ts` file implements. `languageModel()` must
 * stay lazy — construct the underlying SDK client and validate credentials
 * only when called, not at module load. `router.ts` statically imports
 * every provider module regardless of which one `AI_PROVIDER` selects, so
 * eager construction would mean an unused provider's missing API key could
 * break requests for a completely different, correctly-configured one.
 */
export interface AIProviderAdapter {
  readonly id: AIProviderId;
  readonly defaultModel: string;
  languageModel(modelId?: string): LanguageModel;
}

/** Base class for all AI router errors. See `src/lib/errors.ts` for the shared `AppError` contract. */
export class AIRouterError extends AppError {}

/** `AI_PROVIDER` is unset, or set to a value that isn't a registered provider id. */
export class AIProviderUnknownError extends AIRouterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("AI_PROVIDER_UNKNOWN", message, options);
    this.name = "AIProviderUnknownError";
  }
}

/** The selected provider's required credentials (API key, etc.) aren't configured. */
export class AIProviderNotConfiguredError extends AIRouterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("AI_PROVIDER_NOT_CONFIGURED", message, options);
    this.name = "AIProviderNotConfiguredError";
  }
}

/** The provider was reached but generation failed (bad/unparseable response, network error, etc.). */
export class AIGenerationError extends AIRouterError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("AI_GENERATION_FAILED", message, options);
    this.name = "AIGenerationError";
  }
}

export interface GenerateTextOptions {
  prompt: string;
  system?: string;
  /**
   * Overrides `AI_PROVIDER` for this one call. Business logic should
   * normally omit this and rely on the env-configured default — it exists
   * for admin tooling, evals, and tests that need a specific provider.
   */
  provider?: AIProviderId;
  /** Overrides the provider's default model id for this call. */
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateObjectOptions<T> extends GenerateTextOptions {
  schema: ZodType<T>;
}

export type StreamTextOptions = GenerateTextOptions;

/** Provenance metadata attached to every router result — which provider/model actually served the request. */
export interface AIResult {
  readonly provider: AIProviderId;
  readonly model: string;
}

export interface GenerateTextResult extends AIResult {
  readonly text: string;
}

export interface GenerateObjectResult<T> extends AIResult {
  readonly object: T;
}
