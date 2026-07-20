import type { z } from "zod";

import type {
  AnalyticsInsightsInputSchema,
  AnalyticsInsightsOutputSchema,
} from "./schema";

export type AnalyticsInsightsInput = z.infer<typeof AnalyticsInsightsInputSchema>;
export type AnalyticsInsightsOutput = z.infer<typeof AnalyticsInsightsOutputSchema>;
