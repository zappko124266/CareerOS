export type NextStepStage =
  | "resume_missing"
  | "resume_poor"
  | "linkedin_missing"
  | "jobs_missing"
  | "applications_missing"
  | "interview_missing"
  | "healthy";

export interface NextStepInput {
  resumeCount: number;
  latestResumeScore: number | null;
  linkedInOptimized: boolean;
  jobsFound: boolean;
  applicationsStarted: boolean;
  interviewReady: boolean;
  interviewHref: string;
}

export interface NextStep {
  /** Which branch of the priority chain produced this — lets the
   * orchestrator compare "how far along" the user is against what they
   * asked about, without re-deriving readiness itself. Additive field;
   * existing consumers that only read title/why/href/actionLabel are
   * unaffected. */
  stage: NextStepStage;
  title: string;
  why: string;
  href: string;
  actionLabel: string;
}

/**
 * Simple, deterministic priority rule engine — no AI call, no invented
 * data. Every input is a real, already-computed signal (resume count/score,
 * whether a LinkedIn analysis exists, saved-opportunity count, application
 * count, interview prep existence) reused from the same queries the rest
 * of the Coach page already calls. First matching rule wins.
 */
export function recommendNextStep(input: NextStepInput): NextStep {
  if (input.resumeCount === 0) {
    return {
      stage: "resume_missing",
      title: "Create your resume",
      why: "I need your resume to start coaching you.",
      href: "/resume",
      actionLabel: "Add your resume",
    };
  }

  if (input.latestResumeScore === null || input.latestResumeScore < 50) {
    return {
      stage: "resume_poor",
      title: "Improve your resume",
      why: "Increase your chances of passing company screening.",
      href: "/resume",
      actionLabel: "Improve resume",
    };
  }

  if (!input.linkedInOptimized) {
    return {
      stage: "linkedin_missing",
      title: "Optimize your LinkedIn",
      why: "Help recruiters discover your profile.",
      href: "/linkedin",
      actionLabel: "Optimize LinkedIn",
    };
  }

  if (!input.jobsFound) {
    return {
      stage: "jobs_missing",
      title: "Find your next job",
      why: "Real listings, matched to your resume.",
      href: "/opportunities",
      actionLabel: "Find jobs",
    };
  }

  if (!input.applicationsStarted) {
    return {
      stage: "applications_missing",
      title: "Start applying",
      why: "Saved jobs only help once you apply.",
      href: "/applications",
      actionLabel: "Start applying",
    };
  }

  if (!input.interviewReady) {
    return {
      stage: "interview_missing",
      title: "Prepare for an interview",
      why: "Practice before speaking with recruiters.",
      href: input.interviewHref,
      actionLabel: "Prepare now",
    };
  }

  return {
    stage: "healthy",
    title: "Keep the momentum going",
    why: "Stay on top of every application in flight.",
    href: "/applications",
    actionLabel: "Track applications",
  };
}
