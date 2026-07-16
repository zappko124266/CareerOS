import { createGoogle } from "@ai-sdk/google";

import { env } from "@/lib/env.server";
import {
  AIProviderNotConfiguredError,
  type AIProviderAdapter,
} from "@/lib/ai/types";

// Verified against node_modules/@ai-sdk/google/docs — check Google's model
// list before assuming this id is still current.
const DEFAULT_MODEL = "gemini-2.5-flash";

export const geminiProvider: AIProviderAdapter = {
  id: "gemini",
  defaultModel: DEFAULT_MODEL,
  languageModel(modelId = DEFAULT_MODEL) {
    if (!env.GEMINI_API_KEY) {
      throw new AIProviderNotConfiguredError(
        "GEMINI_API_KEY is not set. Add it to your environment to use the gemini AI provider.",
      );
    }

    const google = createGoogle({ apiKey: env.GEMINI_API_KEY });
    return google(modelId);
  },
};
