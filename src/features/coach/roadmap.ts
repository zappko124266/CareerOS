import { recommendNextStep, type NextStepStage } from "./recommend-next-step";
import type { CoachContext } from "./types";

export type MilestoneStatus = "completed" | "current" | "locked";

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  cta: { label: string; href: string };
  route: string;
  why: string;
}

export interface CareerRoadmap {
  milestones: RoadmapMilestone[];
  currentMilestone: RoadmapMilestone;
  progressPercent: number;
}

/**
 * Maps `recommendNextStep`'s stage to the index of the roadmap milestone
 * it corresponds to — reused, not re-derived. Both `resume_missing` and
 * `resume_poor` land on the same "Resume" milestone (index 0); `healthy`
 * means the first 5 milestones are all done, so Offer/Hired (index 5/6,
 * genuinely new checks `recommendNextStep` never covered) take over.
 */
const STAGE_TO_MILESTONE_INDEX: Record<NextStepStage, number> = {
  resume_missing: 0,
  resume_poor: 0,
  linkedin_missing: 1,
  jobs_missing: 2,
  applications_missing: 3,
  interview_missing: 4,
  healthy: 5,
};

/**
 * The Career Roadmap Engine. Derives the 7-milestone view — Resume ->
 * LinkedIn -> Discover Jobs -> Applications -> Interview -> Offer ->
 * Hired — purely from the existing Context Engine output (Step 3: no new
 * query, no AI call). The first 5 milestones reuse `recommendNextStep`'s
 * own priority chain rather than re-deriving readiness; only Offer/Hired
 * are genuinely new checks, both derived from fields already present on
 * `CoachContext` (`applications.totalOffers`, `hired.achieved`).
 */
export function getCareerRoadmap(context: CoachContext): CareerRoadmap {
  const gap = recommendNextStep({
    resumeCount: context.resume.count,
    latestResumeScore: context.resumeAnalysis.latestScore,
    linkedInOptimized: context.linkedIn.hasAnalysis,
    jobsFound: context.jobs.savedCount > 0,
    applicationsStarted: context.applications.total > 0,
    interviewReady: context.interview.isReady,
    interviewHref: context.interview.href,
  });

  const firstIncompleteIndex = STAGE_TO_MILESTONE_INDEX[gap.stage];
  const offerComplete = context.applications.totalOffers > 0;
  const hiredComplete = context.hired.achieved;

  const definitions: Omit<RoadmapMilestone, "status">[] = [
    {
      id: "resume",
      title: "Resume",
      description: "Build and strengthen your resume.",
      why: "Your resume is the foundation everything else builds on.",
      cta: { label: "Work on Resume", href: "/resume" },
      route: "/resume",
    },
    {
      id: "linkedin",
      title: "LinkedIn",
      description: "Optimize your profile so recruiters can find you.",
      why: "Recruiters search LinkedIn before they ever see your resume.",
      cta: { label: "Optimize LinkedIn", href: "/linkedin" },
      route: "/linkedin",
    },
    {
      id: "jobs",
      title: "Discover Jobs",
      description: "Find real listings that match your resume.",
      why: "You need real opportunities to apply your resume to.",
      cta: { label: "Find Jobs", href: "/opportunities" },
      route: "/opportunities",
    },
    {
      id: "applications",
      title: "Applications",
      description: "Apply to the jobs you've found.",
      why: "Saved opportunities only help once you actually apply.",
      cta: { label: "Start Applying", href: "/applications" },
      route: "/applications",
    },
    {
      id: "interview",
      title: "Interview",
      description: "Prepare for conversations with recruiters and hiring managers.",
      why: "Preparation is what turns interviews into offers.",
      cta: { label: "Prepare for Interview", href: context.interview.href },
      route: context.interview.href,
    },
    {
      id: "offer",
      title: "Offer",
      description: "Receive and evaluate job offers.",
      why: "An offer means your preparation paid off.",
      cta: { label: "Review Applications", href: "/applications" },
      route: "/applications",
    },
    {
      id: "hired",
      title: "Hired",
      description: "Start your new role.",
      why: "This is the finish line — everything led here.",
      cta: { label: "Review Applications", href: "/applications" },
      route: "/applications",
    },
  ];

  const milestones: RoadmapMilestone[] = definitions.map((definition, index) => {
    let status: MilestoneStatus;

    if (index < 5) {
      status =
        index < firstIncompleteIndex
          ? "completed"
          : index === firstIncompleteIndex
            ? "current"
            : "locked";
    } else if (index === 5) {
      // Offer — never hide a real offer even if an earlier milestone
      // somehow wasn't tracked; only "current" once the first 5 are done.
      status = offerComplete ? "completed" : firstIncompleteIndex === 5 ? "current" : "locked";
    } else {
      // Hired — same defensive rule as Offer.
      status = hiredComplete
        ? "completed"
        : firstIncompleteIndex === 5 && offerComplete
          ? "current"
          : "locked";
    }

    return { ...definition, status };
  });

  const currentMilestone =
    milestones.find((milestone) => milestone.status === "current") ??
    milestones[milestones.length - 1];

  const completedCount = milestones.filter((milestone) => milestone.status === "completed").length;

  return {
    milestones,
    currentMilestone,
    progressPercent: Math.round((completedCount / milestones.length) * 100),
  };
}
