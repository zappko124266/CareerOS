import "server-only";
import {
  NoObjectGeneratedError,
  Output,
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
} from "ai";

import { logger } from "@/lib/logger";
import { resolveLanguageModel } from "@/lib/ai/router";
import {
  AIGenerationError,
  AIRouterError,
  type GenerateObjectOptions,
  type GenerateObjectResult,
  type GenerateTextOptions,
  type GenerateTextResult,
  type StreamTextOptions,
} from "@/lib/ai/types";

/**
 * Enterprise AI Router — public entry point.
 *
 * `generateText` / `generateObject` / `streamText` are the only functions
 * business logic should call. Which provider actually serves the request
 * is controlled entirely by `AI_PROVIDER` (see `router.ts`); callers never
 * import a provider module directly, so adding, removing, or swapping a
 * provider never touches this file or its callers.
 *
 * This is a separate system from `src/lib/ai/client.ts` (the existing
 * Vercel AI Gateway–based helpers the Resume pipeline uses) — that module
 * is untouched and keeps working exactly as before. Use this router for
 * new features that need direct control over which provider serves a
 * request (cost, latency, or data-residency reasons); use `client.ts` where
 * gateway-managed routing is preferable.
 */

export * from "@/lib/ai/types";
export { resolveLanguageModel, resolveProvider } from "@/lib/ai/router";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function generateText(
  options: GenerateTextOptions,
): Promise<GenerateTextResult> {
  const { prompt, system, temperature, maxOutputTokens } = options;
  const { provider, model, languageModel } = resolveLanguageModel(options);

  const startedAt = Date.now();
  logger.info("ai.router.generate_text.start", {
    provider: provider.id,
    model,
  });

  try {
    const result = await sdkGenerateText({
      model: languageModel,
      system,
      prompt,
      temperature,
      maxOutputTokens,
    });

    logger.info("ai.router.generate_text.success", {
      provider: provider.id,
      model,
      durationMs: Date.now() - startedAt,
    });

    return { text: result.text, provider: provider.id, model };
  } catch (error) {
    logger.error("ai.router.generate_text.failed", {
      provider: provider.id,
      model,
      durationMs: Date.now() - startedAt,
      message: errorMessage(error),
    });

    if (error instanceof AIRouterError) throw error;
    throw new AIGenerationError(`${provider.id} failed to generate text.`, {
      cause: error,
    });
  }
}

export async function generateObject<T>(
  options: GenerateObjectOptions<T>,
): Promise<GenerateObjectResult<T>> {
  const { prompt, system, schema, temperature, maxOutputTokens } = options;
  const { provider, model, languageModel } = resolveLanguageModel(options);

  const startedAt = Date.now();
  logger.info("ai.router.generate_object.start", {
    provider: provider.id,
    model,
  });

  try {
    const result = await sdkGenerateText({
      model: languageModel,
      system,
      prompt,
      temperature,
      maxOutputTokens,
      output: Output.object({ schema }),
    });

    logger.info("ai.router.generate_object.success", {
      provider: provider.id,
      model,
      durationMs: Date.now() - startedAt,
    });

    return { object: result.output, provider: provider.id, model };
  } catch (error) {
    logger.error("ai.router.generate_object.failed", {
      provider: provider.id,
      model,
      durationMs: Date.now() - startedAt,
      message: errorMessage(error),
    });

    if (NoObjectGeneratedError.isInstance(error)) {
      throw new AIGenerationError(
        `${provider.id} did not return a result matching the expected schema.`,
        { cause: error },
      );
    }

    if (error instanceof AIRouterError) throw error;
    throw new AIGenerationError(
      `${provider.id} failed to generate a structured object.`,
      {
        cause: error,
      },
    );
  }
}

/**
 * Streaming errors surface through the stream itself rather than being
 * thrown (see the AI SDK's streaming error-handling docs) — only setup
 * failures (unknown/misconfigured provider) throw synchronously here.
 * `onError` logs in-stream failures; pass your own to also handle them
 * in the UI.
 */
export function streamText(options: StreamTextOptions) {
  const { prompt, system, temperature, maxOutputTokens } = options;
  const { provider, model, languageModel } = resolveLanguageModel(options);

  logger.info("ai.router.stream_text.start", { provider: provider.id, model });

  return sdkStreamText({
    model: languageModel,
    system,
    prompt,
    temperature,
    maxOutputTokens,
    onError: ({ error }) => {
      logger.error("ai.router.stream_text.failed", {
        provider: provider.id,
        model,
        message: errorMessage(error),
      });
    },
  });
}
