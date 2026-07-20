import { z } from "zod";

export const CareerTimelineAnalysisInputSchema = z.object({
  resumeText: z.string().min(1, "resumeText is required"),
});

export const TimelineEntrySchema = z.object({
  period: z.string(),
  role: z.string(),
  company: z.string(),
  note: z.string().nullable(),
});

export const CareerTimelineAnalysisOutputSchema = z.object({
  timeline: z.array(TimelineEntrySchema),
  trajectoryPattern: z.enum(["ascending", "lateral", "mixed", "declining"]),
  narrative: z.string(),
});
