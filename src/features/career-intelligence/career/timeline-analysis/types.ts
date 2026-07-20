import type { z } from "zod";

import type {
  CareerTimelineAnalysisInputSchema,
  CareerTimelineAnalysisOutputSchema,
  TimelineEntrySchema,
} from "./schema";

export type CareerTimelineAnalysisInput = z.infer<
  typeof CareerTimelineAnalysisInputSchema
>;
export type CareerTimelineAnalysisOutput = z.infer<
  typeof CareerTimelineAnalysisOutputSchema
>;
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;
