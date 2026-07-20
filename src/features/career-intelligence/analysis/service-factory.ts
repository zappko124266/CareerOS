import "server-only";
import type { ZodType } from "zod";

import { generateObject as defaultGenerateObject } from "@/lib/ai";
import type { AIProviderId } from "@/lib/ai";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import type { AIDependencies } from "./types";

export interface AnalysisServiceConfig<TInput, TOutput> {
  /** Dot-namespaced identifier used in log events, e.g. `"resume.ats_analysis"`. */
  name: string;
  /** Validates the raw input before it's used to build a prompt. */
  inputSchema: ZodType<TInput>;
  /** Validates (and types) the AI's structured response. */
  outputSchema: ZodType<TOutput>;
  systemPrompt: string;
  buildPrompt: (input: TInput) => string;
  /** Rarely needed — overrides the env-configured AI Router default for this one service. */
  model?: string;
  provider?: AIProviderId;
  temperature?: number;
}

/**
 * Builds a Career Intelligence service function: validates input, calls the
 * AI Router's `generateObject` with the configured prompt/schema, logs
 * start/success/failure, and returns the typed, schema-validated result.
 *
 * Every `resume/*`, `linkedin/*`, `jobs/*`, etc. `service.ts` in this module
 * is a thin call to this factory — it's the one place request/response
 * handling, logging, and input validation are implemented, so every service
 * behaves identically and adding a new one means writing a schema and a
 * prompt, not re-implementing plumbing.
 *
 * The returned function accepts an `AIDependencies` object as its second
 * argument for dependency injection — pass `{ generateObject: fakeFn }` in
 * tests to verify a service's prompt/schema wiring without any network call.
 */
export function createAnalysisService<TInput, TOutput>(
  config: AnalysisServiceConfig<TInput, TOutput>,
) {
  return async function runAnalysisService(
    rawInput: TInput,
    deps: AIDependencies = {},
  ): Promise<TOutput> {
    const generateObject = deps.generateObject ?? defaultGenerateObject;

    const parsedInput = config.inputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      throw new ValidationError(
        `Invalid input for ${config.name}: ${parsedInput.error.issues
          .map((issue) => issue.message)
          .join("; ")}`,
      );
    }

    const startedAt = Date.now();
    logger.info(`career_intelligence.${config.name}.start`, {});

    try {
      const result = await generateObject({
        schema: config.outputSchema,
        system: config.systemPrompt,
        prompt: config.buildPrompt(parsedInput.data),
        model: config.model,
        provider: config.provider,
        temperature: config.temperature,
      });

      logger.info(`career_intelligence.${config.name}.success`, {
        durationMs: Date.now() - startedAt,
        provider: result.provider,
        model: result.model,
      });

      return result.object;
    } catch (error) {
      logger.error(`career_intelligence.${config.name}.failed`, {
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
