import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/lib/env.server";
import {
  AIProviderNotConfiguredError,
  type AIProviderAdapter,
} from "@/lib/ai/types";

// NVIDIA NIM exposes an OpenAI-compatible chat completions API — there's no
// dedicated `@ai-sdk/nvidia` package, so this goes through the generic
// OpenAI-compatible adapter instead.
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Verified against https://integrate.api.nvidia.com/v1/models — check that
// endpoint before assuming this id is still current.
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

export const nvidiaProvider: AIProviderAdapter = {
  id: "nvidia",
  defaultModel: DEFAULT_MODEL,
  languageModel(modelId = DEFAULT_MODEL) {
    if (!env.NVIDIA_API_KEY) {
      throw new AIProviderNotConfiguredError(
        "NVIDIA_API_KEY is not set. Add it to your environment to use the nvidia AI provider.",
      );
    }

    const nvidia = createOpenAICompatible({
      name: "nvidia",
      apiKey: env.NVIDIA_API_KEY,
      baseURL: NVIDIA_BASE_URL,
      supportsStructuredOutputs: true,
    });

    return nvidia(modelId);
  },
};
