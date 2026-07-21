import type { CoachIntent, CoachWorkflow } from "./types";

/**
 * The intent → existing-feature mapping registry (Step 3). One row per
 * intent, documenting which already-built service/page it hands off to.
 * Nothing here calls those services — the orchestrator only reads this
 * table and points the user at the real page.
 */
export const COACH_WORKFLOWS: Record<CoachIntent, CoachWorkflow> = {
  resume: {
    intent: "resume",
    service: "features/resume/service.ts (parseResume, scoreResume) + Resume Studio's tailorResume",
    page: "Resume Studio",
    route: "/resume",
    suggestedAction: "I can help improve your resume. Let's begin.",
    ctaLabel: "Improve Resume",
    futureAiHook:
      "career-intelligence/resume/* (analyzeResumeAts, analyzeResumeKeywords, analyzeResumeWeaknesses) via the AI Router",
  },
  jobs: {
    intent: "jobs",
    service: "features/opportunities/service.ts + providers/* (Adzuna, Jooble, Greenhouse, Lever, ...)",
    page: "Jobs",
    route: "/opportunities",
    suggestedAction: "I can help you find real job listings that match your resume.",
    ctaLabel: "Find Jobs",
    futureAiHook:
      "career-intelligence/jobs/* (buildSearchStrategy, rankJobs, rankCompanies) via the AI Router",
  },
  linkedin: {
    intent: "linkedin",
    service: "features/linkedin-profile/service.ts (analyzeLinkedInProfile)",
    page: "LinkedIn",
    route: "/linkedin",
    suggestedAction: "Let's optimize your LinkedIn profile so recruiters can find you.",
    ctaLabel: "Optimize LinkedIn",
    futureAiHook:
      "career-intelligence/linkedin/* (seo-analysis, headline/about optimization) via the AI Router",
  },
  interview: {
    intent: "interview",
    service: "features/interviews/service.ts",
    page: "Interview Workspace (inside an Opportunity)",
    route: "/opportunities",
    suggestedAction: "Let's get you ready to speak with recruiters and hiring managers.",
    ctaLabel: "Prepare for Interview",
    futureAiHook: "career-intelligence/interview/* interview-prep generation via the AI Router",
  },
  applications: {
    intent: "applications",
    service: "features/opportunities/queries.ts (listOpportunitiesForUser) + features/analytics/service.ts",
    page: "Applications",
    route: "/applications",
    suggestedAction: "Let's take a look at where your applications stand.",
    ctaLabel: "Review Applications",
    futureAiHook: "career-intelligence application review/strategy services via the AI Router",
  },
  career_switch: {
    intent: "career_switch",
    service:
      "features/career-intelligence/career/* (progression-suggestions, timeline-analysis) + CareerGapPanel",
    page: "Jobs (closest existing entry point — no dedicated pivot-planning page yet)",
    route: "/opportunities",
    suggestedAction:
      "Changing direction is a bigger conversation — start by exploring roles in the field you're targeting.",
    ctaLabel: "Explore Jobs",
    futureAiHook: "career-intelligence/career/progression-suggestions via the AI Router",
  },
  salary: {
    intent: "salary",
    service: "features/salary/service.ts (generateSalaryEstimate) + career-intelligence/salary/salary-estimation",
    page: "Dashboard (no dedicated salary page is currently linked from navigation)",
    route: "/dashboard",
    suggestedAction: "Salary estimates use your resume and role details — here's your overview for now.",
    ctaLabel: "View Dashboard",
    futureAiHook: "career-intelligence/salary/salary-estimation (estimateSalary) via the AI Router",
  },
  general_advice: {
    intent: "general_advice",
    service: "recommendNextStep (real-progress rule engine)",
    page: "AI Coach",
    route: "/coach",
    // Resolved dynamically from `CoachContext.nextStep` in orchestrator.ts.
    suggestedAction: "",
    ctaLabel: "",
    futureAiHook: "@/lib/ai generateText (AI Router) for open-ended career-advice answers",
  },
  unknown: {
    intent: "unknown",
    service: "recommendNextStep (real-progress rule engine)",
    page: "AI Coach",
    route: "/coach",
    suggestedAction: "",
    ctaLabel: "",
    futureAiHook: "@/lib/ai generateText (AI Router) as a general-purpose fallback",
  },
};
