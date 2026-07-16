import "server-only";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import type { z } from "zod";

import { ParsingError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { DEFAULT_MODEL } from "@/lib/ai/models";

/**
 * The only place feature code should talk to an LLM. Everything routes
 * through the Vercel AI Gateway (`AI_GATEWAY_API_KEY`), so swapping models
 * or providers later is a string change here — not new adapter code
 * per-feature.
 */

export async function generateStructured<T>(options: {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  model?: string;
}): Promise<T> {
  const { schema, prompt, system, model = DEFAULT_MODEL } = options;

  try {
    const result = await generateText({
      model,
      system,
      prompt,
      output: Output.object({ schema }),
    });

    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      logger.error("ai.structured_generation_failed", {
        model,
        cause:
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause),
      });
      throw new ParsingError(
        "The AI couldn't produce a valid result for that input. Please try again.",
        { cause: error },
      );
    }

    logger.error("ai.generate_error", {
      model,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function generatePlainText(options: {
  prompt: string;
  system?: string;
  model?: string;
}): Promise<string> {
  const { prompt, system, model = DEFAULT_MODEL } = options;
  const result = await generateText({ model, system, prompt });
  return result.text;
}
