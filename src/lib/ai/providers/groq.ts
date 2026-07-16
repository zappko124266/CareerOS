import { createGroq } from "@ai-sdk/groq";

import { env } from "@/lib/env.server";
import {
  AIProviderNotConfiguredError,
  type AIProviderAdapter,
} from "@/lib/ai/types";

// Verified against node_modules/@ai-sdk/groq/docs — check Groq's model list
// before assuming this id is still current.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export const groqProvider: AIProviderAdapter = {
  id: "groq",
  defaultModel: DEFAULT_MODEL,
  languageModel(modelId = DEFAULT_MODEL) {
    if (!env.GROQ_API_KEY) {
      throw new AIProviderNotConfiguredError(
        "GROQ_API_KEY is not set. Add it to your environment to use the groq AI provider.",
      );
    }

    const groq = createGroq({ apiKey: env.GROQ_API_KEY });
    return groq(modelId);
  },
};
