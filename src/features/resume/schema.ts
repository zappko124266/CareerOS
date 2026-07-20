import { z } from "zod";

/**
 * Canonical shape of a parsed resume. Stored as `Resume.parsedData` (Json)
 * — validated here at the application boundary rather than modeled as
 * relational tables, since sections are variable-shape and always
 * read/written as a whole.
 */
export const ResumeContactSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  links: z.array(z.object({ label: z.string(), url: z.string() })),
});

export const ResumeExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  current: z.boolean(),
  bullets: z.array(z.string()),
});

export const ResumeEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const ResumeCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  date: z.string().nullable(),
});

export const ResumeProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  bullets: z.array(z.string()),
  link: z.string().nullable(),
});

export const ResumeDataSchema = z.object({
  contact: ResumeContactSchema,
  summary: z.string().nullable(),
  experience: z.array(ResumeExperienceSchema),
  education: z.array(ResumeEducationSchema),
  skills: z.array(z.string()),
  certifications: z.array(ResumeCertificationSchema),
  projects: z.array(ResumeProjectSchema),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type ResumeContact = z.infer<typeof ResumeContactSchema>;
export type ResumeExperience = z.infer<typeof ResumeExperienceSchema>;
export type ResumeEducation = z.infer<typeof ResumeEducationSchema>;
export type ResumeCertification = z.infer<typeof ResumeCertificationSchema>;
export type ResumeProject = z.infer<typeof ResumeProjectSchema>;

/**
 * Stored as `ResumeAnalysis.breakdown` (Json). Each dimension is 0-100;
 * `ResumeAnalysis.overallScore` is their weighted average (see
 * `features/resume/service.ts`).
 */
export const AtsScoreBreakdownSchema = z.object({
  keywordRelevance: z.number().min(0).max(100),
  formatting: z.number().min(0).max(100),
  sectionCompleteness: z.number().min(0).max(100),
  impactLanguage: z.number().min(0).max(100),
  quantifiedAchievements: z.number().min(0).max(100),
});

export type AtsScoreBreakdown = z.infer<typeof AtsScoreBreakdownSchema>;

export const OptimizationSuggestionSchema = z.object({
  section: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  issue: z.string(),
  suggestion: z.string(),
});

export type OptimizationSuggestion = z.infer<
  typeof OptimizationSuggestionSchema
>;

export const ResumeAnalysisResultSchema = z.object({
  breakdown: AtsScoreBreakdownSchema,
  suggestions: z.array(OptimizationSuggestionSchema),
});

export type ResumeAnalysisResult = z.infer<typeof ResumeAnalysisResultSchema>;
