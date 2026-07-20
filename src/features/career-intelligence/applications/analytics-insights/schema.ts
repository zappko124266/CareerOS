import { z } from "zod";

const groupedRateSchema = z.object({
  label: z.string(),
  applications: z.number().int(),
  responseRate: z.number(),
});

export const AnalyticsInsightsInputSchema = z.object({
  totalApplications: z.number().int(),
  responseRate: z.number(),
  interviewRate: z.number(),
  offerRate: z.number(),
  topCompanies: z.array(groupedRateSchema),
  topRoles: z.array(groupedRateSchema),
  resumePerformance: z.array(groupedRateSchema),
  coverLetterResponseRateWith: z.number().nullable(),
  coverLetterResponseRateWithout: z.number().nullable(),
});

export const AnalyticsInsightsOutputSchema = z.object({
  insights: z.array(
    z.object({
      recommendation: z.string(),
      reasoning: z.string(),
    }),
  ),
});
