import { z } from "zod";

/** Mirrors `ApplicationDocumentKind` in `prisma/schema.prisma`. */
export const ApplicationDocumentKindSchema = z.enum([
  "COVER_LETTER",
  "EMAIL",
  "RECRUITER_MESSAGE",
]);

/** Mirrors `ApplicationDocumentSubtype` — only meaningful for EMAIL and
 * RECRUITER_MESSAGE kinds; a cover letter uses `audience` instead. */
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

/** Mirrors `ApplicationDocumentAudience` — only meaningful for COVER_LETTER. */
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

/** Mirrors `ApplicationDocumentTone`. */
export const ApplicationDocumentToneSchema = z.enum([
  "PROFESSIONAL",
  "FRIENDLY",
  "EXECUTIVE",
  "TECHNICAL",
  "CREATIVE",
]);

/** Mirrors `ApplicationDocumentLength`. */
export const ApplicationDocumentLengthSchema = z.enum(["SHORT", "MEDIUM", "LONG"]);

/** The one AI call behind all three studios (Cover Letter, Email, Recruiter
 * Message) and every edit action within them — `GENERATE` drafts new
 * content from scratch; every other value transforms `existingContent`. */
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

export const ApplicationDocumentGenerationInputSchema = z
  .object({
    kind: ApplicationDocumentKindSchema,
    action: ApplicationDocumentActionSchema,
    subtype: ApplicationDocumentSubtypeSchema.optional(),
    audience: ApplicationDocumentAudienceSchema.optional(),
    tone: ApplicationDocumentToneSchema.optional(),
    length: ApplicationDocumentLengthSchema.optional(),
    resumeText: z.string().min(1, "resumeText is required"),
    jobDescription: z.string().min(1, "jobDescription is required"),
    companyName: z.string().min(1, "companyName is required"),
    roleTitle: z.string().min(1, "roleTitle is required"),
    senderName: z.string().optional(),
    /** Required for every action except `GENERATE` — enforced in
     * `service.ts` since it depends on the sibling `action` field. */
    existingContent: z.string().optional(),
    /** Only relevant for `kind: "EMAIL"` revise actions — lets the model
     * see (and consistently revise) the subject line alongside the body,
     * instead of rewriting the body with no awareness of what the subject
     * currently says. */
    existingSubjectLine: z.string().optional(),
  })
  .refine(
    (input) => input.action === "GENERATE" || Boolean(input.existingContent?.trim()),
    {
      message: "existingContent is required for anything other than the initial GENERATE action.",
      path: ["existingContent"],
    },
  );

export const ApplicationDocumentGenerationOutputSchema = z.object({
  content: z.string(),
  /** Only meaningful for `kind: "EMAIL"` — omitted/ignored otherwise. */
  subjectLine: z.string().optional(),
});
