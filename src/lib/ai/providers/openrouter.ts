import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { env } from "@/lib/env.server";
import {
  AIProviderNotConfiguredError,
  type AIProviderAdapter,
} from "@/lib/ai/types";

// Verified against node_modules/@openrouter/ai-sdk-provider/README.md —
// check https://openrouter.ai/models before assuming this id is still
// current, OpenRouter's catalog changes constantly.
const DEFAULT_MODEL = "openai/gpt-4o";

export const openrouterProvider: AIProviderAdapter = {
  id: "openrouter",
  defaultModel: DEFAULT_MODEL,
  languageModel(modelId = DEFAULT_MODEL) {
    if (!env.OPENROUTER_API_KEY) {
      throw new AIProviderNotConfiguredError(
        "OPENROUTER_API_KEY is not set. Add it to your environment to use the openrouter AI provider.",
      );
    }

    const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
    return openrouter(modelId);
  },
};
