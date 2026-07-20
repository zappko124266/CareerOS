import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";

import { ANALYTICS_INSIGHTS_SYSTEM_PROMPT, buildAnalyticsInsightsPrompt } from "./prompt";
import { AnalyticsInsightsInputSchema, AnalyticsInsightsOutputSchema } from "./schema";
import type { AnalyticsInsightsInput, AnalyticsInsightsOutput } from "./types";

export const generateAnalyticsInsights = createAnalysisService<
  AnalyticsInsightsInput,
  AnalyticsInsightsOutput
>({
  name: "applications.analytics_insights",
  inputSchema: AnalyticsInsightsInputSchema,
  outputSchema: AnalyticsInsightsOutputSchema,
  systemPrompt: ANALYTICS_INSIGHTS_SYSTEM_PROMPT,
  buildPrompt: buildAnalyticsInsightsPrompt,
});

export type { AnalyticsInsightsInput, AnalyticsInsightsOutput };
