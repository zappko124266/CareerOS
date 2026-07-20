import type { z } from "zod";

import type {
  ApplicationDocumentActionSchema,
  ApplicationDocumentAudienceSchema,
  ApplicationDocumentKindSchema,
  ApplicationDocumentLengthSchema,
  ApplicationDocumentSubtypeSchema,
  ApplicationDocumentToneSchema,
  CreateApplicationDocumentVersionInputSchema,
  GenerateApplicationDocumentInputSchema,
  ReviseApplicationDocumentInputSchema,
  SaveApplicationDocumentDraftInputSchema,
} from "./schema";

export type ApplicationDocumentKind = z.infer<typeof ApplicationDocumentKindSchema>;
export type ApplicationDocumentSubtype = z.infer<typeof ApplicationDocumentSubtypeSchema>;
export type ApplicationDocumentAudience = z.infer<typeof ApplicationDocumentAudienceSchema>;
export type ApplicationDocumentTone = z.infer<typeof ApplicationDocumentToneSchema>;
export type ApplicationDocumentLength = z.infer<typeof ApplicationDocumentLengthSchema>;
export type ApplicationDocumentAction = z.infer<typeof ApplicationDocumentActionSchema>;

export type GenerateApplicationDocumentInput = z.infer<
  typeof GenerateApplicationDocumentInputSchema
>;
export type ReviseApplicationDocumentInput = z.infer<
  typeof ReviseApplicationDocumentInputSchema
>;
export type SaveApplicationDocumentDraftInput = z.infer<
  typeof SaveApplicationDocumentDraftInputSchema
>;
export type CreateApplicationDocumentVersionInput = z.infer<
  typeof CreateApplicationDocumentVersionInputSchema
>;

/** Which subtypes belong to which document kind, and which shaping inputs
 * (audience vs subtype/length) apply — the one place the UI and any
 * validation logic read this from, instead of three copies. */
export const DOCUMENT_KIND_LABEL: Record<ApplicationDocumentKind, string> = {
  COVER_LETTER: "Cover Letter",
  EMAIL: "Email",
  RECRUITER_MESSAGE: "Recruiter Message",
};

export const EMAIL_SUBTYPES: ApplicationDocumentSubtype[] = [
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
];

export const RECRUITER_MESSAGE_SUBTYPES: ApplicationDocumentSubtype[] = [
  "LINKEDIN_MESSAGE",
  "REFERRAL_REQUEST",
  "NETWORKING_MESSAGE",
  "TALENT_COMMUNITY_MESSAGE",
  "APPLICATION_REMINDER",
  "THANK_YOU_MESSAGE",
];

export const SUBTYPE_LABEL: Record<ApplicationDocumentSubtype, string> = {
  APPLICATION_EMAIL: "Application Email",
  RECRUITER_EMAIL: "Recruiter Email",
  HIRING_MANAGER_EMAIL: "Hiring Manager Email",
  COLD_OUTREACH: "Cold Outreach",
  REFERRAL_REQUEST: "Referral Request",
  FOLLOW_UP: "Follow-up",
  INTERVIEW_CONFIRMATION: "Interview Confirmation",
  INTERVIEW_REMINDER: "Interview Reminder",
  INTERVIEW_THANK_YOU: "Interview Thank You",
  SALARY_NEGOTIATION: "Salary Negotiation",
  OFFER_ACCEPTANCE: "Offer Acceptance",
  OFFER_DECLINE: "Offer Decline",
  LINKEDIN_MESSAGE: "LinkedIn Message",
  NETWORKING_MESSAGE: "Networking Message",
  TALENT_COMMUNITY_MESSAGE: "Talent Community Message",
  APPLICATION_REMINDER: "Application Reminder",
  THANK_YOU_MESSAGE: "Thank You Message",
};

export const AUDIENCE_LABEL: Record<ApplicationDocumentAudience, string> = {
  HIRING_MANAGER: "Hiring Manager",
  RECRUITER: "Recruiter",
  REFERRAL: "Referral",
  FRESHER: "Fresher",
  EXPERIENCED: "Experienced Professional",
  INTERNSHIP: "Internship",
  EXECUTIVE: "Executive",
  STARTUP: "Startup",
  ENTERPRISE: "Enterprise",
  REMOTE: "Remote",
  GOVERNMENT: "Government",
  COMPANY: "Company",
};

export const TONE_LABEL: Record<ApplicationDocumentTone, string> = {
  PROFESSIONAL: "Professional",
  FRIENDLY: "Friendly",
  EXECUTIVE: "Executive",
  TECHNICAL: "Technical",
  CREATIVE: "Creative",
};

export const LENGTH_LABEL: Record<ApplicationDocumentLength, string> = {
  SHORT: "Short",
  MEDIUM: "Medium",
  LONG: "Long",
};

export const ACTION_LABEL: Record<ApplicationDocumentAction, string> = {
  GENERATE: "Generate",
  REWRITE: "Rewrite",
  EXPAND: "Expand",
  SHORTEN: "Shorten",
  IMPROVE: "Improve",
  ATS_FRIENDLY: "Make ATS-friendly",
  GRAMMAR: "Fix grammar",
  CHANGE_TONE: "Change tone",
};

// ---------------------------------------------------------------------------
// Sprint 7 — Application Automation Engine
// ---------------------------------------------------------------------------

/** Mirrors `SubmissionMethod` — every value is something the *user* did
 * themselves (in their own browser / inbox) and then confirmed to
 * CareerOS; see the enum's doc comment in `prisma/schema.prisma` for why
 * `OFFICIAL_API` is reserved and unused today. */
export const SUBMISSION_METHODS = [
  "COMPANY_CAREER_PAGE_MANUAL",
  "EMAIL_MANUAL",
  "USER_APPROVED_BROWSER_MANUAL",
] as const;
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number];

export const SUBMISSION_METHOD_LABEL: Record<string, string> = {
  COMPANY_CAREER_PAGE_MANUAL: "Applied on company career page",
  EMAIL_MANUAL: "Applied by email",
  USER_APPROVED_BROWSER_MANUAL: "Applied via listing link",
  OFFICIAL_API: "Official API (not available for any connector yet)",
};

export const SUBMISSION_RESULTS = ["PENDING", "CONFIRMED", "FAILED"] as const;
export type SubmissionResult = (typeof SUBMISSION_RESULTS)[number];

export const FOLLOW_UP_RECOMMENDATION_LABEL: Record<string, string> = {
  FOLLOW_UP_NOW: "Follow up now",
  WAIT: "Wait",
  SEND_REMINDER: "Send a reminder",
  UPDATE_RESUME: "Update your resume first",
  WITHDRAW: "Consider withdrawing",
  APPLY_ELSEWHERE: "Focus elsewhere",
};

/** Opportunity statuses that mean "not yet submitted" — the Follow-up
 * Engine has nothing to recommend until the application has actually been
 * applied to (or further along). */
export const PRE_APPLICATION_STATUSES = [
  "DISCOVERED",
  "SAVED",
  "READY",
  "PREPARING",
  "READY_FOR_REVIEW",
  "AWAITING_APPROVAL",
] as const;

export interface StrategyFactorView {
  value: boolean;
  reasoning: string;
}

export const STRATEGY_FACTOR_LABEL: Record<string, string> = {
  needsTailoring: "Tailor resume to this role",
  needsAtsOptimization: "Optimize resume for ATS",
  needsCoverLetter: "Write a cover letter",
  needsRecruiterMessage: "Send a recruiter message",
  needsPortfolio: "Add a portfolio link",
  needsCertifications: "Add relevant certifications",
  needsLinkedinUpdate: "Update LinkedIn profile",
  needsResumeRewrite: "Rewrite resume sections",
  needsSkillImprovement: "Improve missing skills",
};
