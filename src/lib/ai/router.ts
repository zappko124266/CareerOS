import type { LanguageModel } from "ai";

import { env } from "@/lib/env.server";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { groqProvider } from "@/lib/ai/providers/groq";
import { nvidiaProvider } from "@/lib/ai/providers/nvidia";
import { openrouterProvider } from "@/lib/ai/providers/openrouter";
import type { AIProviderAdapter, AIProviderId } from "@/lib/ai/types";
import { AI_PROVIDER_IDS, AIProviderUnknownError } from "@/lib/ai/types";

/**
 * The only place that lists every provider. To add a new one: create
 * `providers/<name>.ts` implementing `AIProviderAdapter`, add its id to
 * `AI_PROVIDER_IDS` in `types.ts`, and register it here. Nothing in
 * `index.ts` (the public `generateText`/`generateObject`/`streamText` API)
 * or any feature that calls it needs to change.
 */
const PROVIDER_REGISTRY: Record<AIProviderId, AIProviderAdapter> = {
  nvidia: nvidiaProvider,
  groq: groqProvider,
  gemini: geminiProvider,
  openrouter: openrouterProvider,
};

/** Resolves which provider adapter to use: an explicit override, else `AI_PROVIDER` from the environment. */
export function resolveProvider(providerId?: AIProviderId): AIProviderAdapter {
  const id = providerId ?? env.AI_PROVIDER;

  if (!id) {
    throw new AIProviderUnknownError(
      `AI_PROVIDER is not set. Set it to one of: ${AI_PROVIDER_IDS.join(", ")}.`,
    );
  }

  const provider = PROVIDER_REGISTRY[id];

  if (!provider) {
    throw new AIProviderUnknownError(
      `Unknown AI provider "${id}". Valid providers: ${AI_PROVIDER_IDS.join(", ")}.`,
    );
  }

  return provider;
}

/** Resolves the provider and constructs its language model in one step. */
export function resolveLanguageModel(options?: {
  provider?: AIProviderId;
  model?: string;
}): {
  provider: AIProviderAdapter;
  model: string;
  languageModel: LanguageModel;
} {
  const provider = resolveProvider(options?.provider);
  const model = options?.model ?? provider.defaultModel;

  return { provider, model, languageModel: provider.languageModel(model) };
}
