import { z } from "zod";

import { OPPORTUNITY_PROVIDER_IDS } from "./providers/types";

/** Mirrors `OpportunityType` in `prisma/schema.prisma` — kept as an
 * independent literal list (not imported from the generated client) so
 * this schema file has no dependency on generated output, same convention
 * as `src/features/resume/schema.ts`. */
export const OpportunityTypeSchema = z.enum([
  "JOB",
  "INTERNSHIP",
  "CONTRACT",
  "FREELANCE",
  "CAMPUS",
]);

/** Mirrors `OpportunityStatus` in `prisma/schema.prisma`. */
export const OpportunityStatusSchema = z.enum([
  "DISCOVERED",
  "SAVED",
  "READY",
  "PREPARING",
  "READY_FOR_REVIEW",
  "AWAITING_APPROVAL",
  "APPLIED",
  "APPLICATION_VIEWED",
  "RECRUITER_CONTACT",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "DECLINED",
  "REJECTED",
  "WITHDRAWN",
  "JOINED",
  "ARCHIVED",
]);

export const OpportunitySourceSchema = z.enum(OPPORTUNITY_PROVIDER_IDS);

/** Validates `Opportunity.skills` (Json) at the application boundary —
 * same rationale as `Resume.parsedData`: variable-shape, always
 * read/written as a whole. */
export const OpportunitySkillsSchema = z.array(z.string());

export const StatusHistoryEntrySchema = z.object({
  status: OpportunityStatusSchema,
  changedAt: z.iso.datetime(),
});
export const StatusHistorySchema = z.array(StatusHistoryEntrySchema);

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  done: z.boolean(),
});
export const ChecklistSchema = z.array(ChecklistItemSchema);

/** Module 6's "Custom Questions" — free-text application-form questions
 * specific to one listing (e.g. "Why do you want to work here?"), plus
 * the user's own answer. Never AI-generated automatically; the user
 * writes the answer themselves, same as `coverLetter`/`recruiterNotes`. */
export const CustomQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  answer: z.string(),
});
export const CustomQuestionsSchema = z.array(CustomQuestionSchema);

/** Search input from the Discovery page's filter form. */
export const OpportunitySearchInputSchema = z.object({
  query: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  remote: z.boolean().optional(),
  salaryMin: z.number().int().min(0).max(2_000_000).optional(),
  employmentType: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).default(1),
});

/** What the client sends when saving a search result — the normalized
 * provider fields plus which provider it came from. Re-validated
 * server-side rather than trusted, since it crosses the client boundary. */
export const SaveOpportunityInputSchema = z.object({
  source: OpportunitySourceSchema,
  sourceId: z.string().min(1),
  type: OpportunityTypeSchema,
  title: z.string().min(1),
  companyName: z.string().min(1),
  location: z.string().nullable(),
  remote: z.boolean(),
  employmentType: z.string().nullable(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  description: z.string(),
  skills: z.array(z.string()),
  applyUrl: z.string(),
});

export const UpdateStatusInputSchema = z.object({
  opportunityId: z.uuid(),
  status: OpportunityStatusSchema,
});

export const UpdateChecklistInputSchema = z.object({
  opportunityId: z.uuid(),
  checklist: ChecklistSchema,
});

export const UpdateCustomQuestionsInputSchema = z.object({
  opportunityId: z.uuid(),
  customQuestions: CustomQuestionsSchema,
});

export const UpdateNotesInputSchema = z.object({
  opportunityId: z.uuid(),
  coverLetter: z.string().max(10_000).optional(),
  recruiterNotes: z.string().max(10_000).optional(),
  resumeId: z.uuid().nullable().optional(),
});
