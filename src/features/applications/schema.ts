import { z } from "zod";

/** Mirrors `ApplicationDocumentKind` in `prisma/schema.prisma` — independent
 * literal list rather than importing the generated enum, same convention
 * used throughout this codebase (e.g. `OpportunityStatus`). */
export const ApplicationDocumentKindSchema = z.enum([
  "COVER_LETTER",
  "EMAIL",
  "RECRUITER_MESSAGE",
]);

export const ApplicationDocumentSubtypeSchema = z.enum([
  "APPLICATION_EMAIL",
  "RECRUITER_EMAIL",
  "HIRING_MANAGER_EMAIL",
  "COLD_OUTREACH",
  "REFERRAL_REQUEST",
  "FOLLOW_UP",
  "INTERVIEW_CONFIRMATION",
  "INTERVIEW_REMINDER",
  "INTERVIEW_THANK_YOU",
  "SALARY_NEGOTIATION",
  "OFFER_ACCEPTANCE",
  "OFFER_DECLINE",
  "LINKEDIN_MESSAGE",
  "NETWORKING_MESSAGE",
  "TALENT_COMMUNITY_MESSAGE",
  "APPLICATION_REMINDER",
  "THANK_YOU_MESSAGE",
]);

export const ApplicationDocumentAudienceSchema = z.enum([
  "HIRING_MANAGER",
  "RECRUITER",
  "REFERRAL",
  "FRESHER",
  "EXPERIENCED",
  "INTERNSHIP",
  "EXECUTIVE",
  "STARTUP",
  "ENTERPRISE",
  "REMOTE",
  "GOVERNMENT",
  "COMPANY",
]);

export const ApplicationDocumentToneSchema = z.enum([
  "PROFESSIONAL",
  "FRIENDLY",
  "EXECUTIVE",
  "TECHNICAL",
  "CREATIVE",
]);

export const ApplicationDocumentLengthSchema = z.enum(["SHORT", "MEDIUM", "LONG"]);

export const ApplicationDocumentActionSchema = z.enum([
  "GENERATE",
  "REWRITE",
  "EXPAND",
  "SHORTEN",
  "IMPROVE",
  "ATS_FRIENDLY",
  "GRAMMAR",
  "CHANGE_TONE",
]);

export const GenerateApplicationDocumentInputSchema = z.object({
  opportunityId: z.uuid(),
  kind: ApplicationDocumentKindSchema,
  subtype: ApplicationDocumentSubtypeSchema.optional(),
  audience: ApplicationDocumentAudienceSchema.optional(),
  tone: ApplicationDocumentToneSchema.optional(),
  length: ApplicationDocumentLengthSchema.optional(),
});

export const ReviseApplicationDocumentInputSchema = z.object({
  documentId: z.uuid(),
  action: ApplicationDocumentActionSchema,
  tone: ApplicationDocumentToneSchema.optional(),
});

export const SaveApplicationDocumentDraftInputSchema = z.object({
  documentId: z.uuid(),
  content: z.string().max(20_000),
  subjectLine: z.string().max(500).optional(),
});

export const CreateApplicationDocumentVersionInputSchema = z.object({
  documentId: z.uuid(),
  label: z.string().trim().min(1).max(200),
});

export const SubmissionMethodSchema = z.enum([
  "COMPANY_CAREER_PAGE_MANUAL",
  "EMAIL_MANUAL",
  "USER_APPROVED_BROWSER_MANUAL",
]);

export const RecordApplicationSubmissionInputSchema = z.object({
  opportunityId: z.uuid(),
  method: SubmissionMethodSchema,
  coverLetterDocumentId: z.uuid().optional(),
  recruiterMessageDocumentId: z.uuid().optional(),
  emailDocumentId: z.uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export const RecordFailedSubmissionInputSchema = z.object({
  submissionId: z.uuid(),
  failureReason: z.string().trim().min(1).max(2000),
});
