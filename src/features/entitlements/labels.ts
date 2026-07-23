import type { MeteredFeature } from "./types";

/** Human-readable label + grouping for the Billing & Usage page. Purely
 * presentational — doesn't change what's metered or how. */
export const METERED_FEATURE_LABEL: Record<MeteredFeature, string> = {
  RESUME_TAILORING: "AI resume tailoring",
  RESUME_EXPORT: "Resume export (PDF/DOCX)",
  APPLICATION_DOCUMENT_GENERATION: "Application document generation",
  APPLICATION_REVIEW: "Application review",
  APPLICATION_EXPORT: "Application export",
  COMPANY_SNAPSHOT: "Company snapshot",
  JOB_DISCOVERY_RUN: "Job discovery run",
  APPLICATION_STRATEGY: "Application strategy",
  FOLLOW_UP_RECOMMENDATION: "Follow-up recommendation",
  ANALYTICS_INSIGHTS: "Analytics insights",
  INTERVIEW_PREP: "Interview coach",
  COMPANY_RESEARCH: "Company research",
  SALARY_ESTIMATE: "Salary estimate",
  CAREER_HEALTH_SCORE: "Career health score",
  OFFER_COMPARISON: "Offer comparison",
  CAREER_GAP_ASSESSMENT: "Career gap assessment",
  LINKEDIN_ANALYSIS: "LinkedIn SEO analysis",
  GMAIL_SYNC: "Gmail intelligence sync",
  CALENDAR_SYNC: "Calendar intelligence sync",
};

export const METERED_FEATURE_CATEGORY: Record<MeteredFeature, string> = {
  RESUME_TAILORING: "Resume",
  RESUME_EXPORT: "Resume",
  APPLICATION_DOCUMENT_GENERATION: "Applications",
  APPLICATION_REVIEW: "Applications",
  APPLICATION_EXPORT: "Applications",
  APPLICATION_STRATEGY: "Applications",
  FOLLOW_UP_RECOMMENDATION: "Applications",
  ANALYTICS_INSIGHTS: "Applications",
  OFFER_COMPARISON: "Applications",
  INTERVIEW_PREP: "Interviews",
  COMPANY_SNAPSHOT: "Companies & Career Intelligence",
  COMPANY_RESEARCH: "Companies & Career Intelligence",
  SALARY_ESTIMATE: "Companies & Career Intelligence",
  CAREER_HEALTH_SCORE: "Companies & Career Intelligence",
  CAREER_GAP_ASSESSMENT: "Companies & Career Intelligence",
  LINKEDIN_ANALYSIS: "Companies & Career Intelligence",
  JOB_DISCOVERY_RUN: "Discovery",
  GMAIL_SYNC: "Discovery",
  CALENDAR_SYNC: "Interviews",
};

export const FEATURE_CATEGORY_ORDER = [
  "Resume",
  "Applications",
  "Interviews",
  "Companies & Career Intelligence",
  "Discovery",
] as const;
