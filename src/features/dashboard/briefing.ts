import { DIMENSION_LABEL } from "@/components/resume/ats-score-panel";
import type { AvailabilityWindow } from "@/features/discovery/types";
import { AtsScoreBreakdownSchema } from "@/features/resume/schema";
import type { ResumeAnalysis } from "@/generated/prisma/client";

export interface BriefingAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface Briefing {
  headline: string;
  detail: string;
  actions: BriefingAction[];
}

/**
 * The AI Copilot's daily briefing — entirely derived from real, persisted
 * data (resume count, latest ATS score + breakdown, plus the user's own
 * onboarding answer for their target role, if they've given one). No AI
 * call happens just to render the dashboard; the deeper AI Recommendations
 * card is where the user opts into an actual model call.
 */
export function buildBriefing(
  resumeCount: number,
  latestAnalysis: ResumeAnalysis | null,
  targetRole?: string | null,
  urgency?: AvailabilityWindow | null,
): Briefing {
  if (resumeCount === 0) {
    return {
      headline:
        urgency === "IMMEDIATE"
          ? "Let's move fast — starting with your resume."
          : "Let's give your AI agent something to work with.",
      detail: targetRole
        ? `Upload your resume and CareerOS will score it against ATS systems in seconds, then guide you toward that ${targetRole} role.`
        : "Upload your resume and CareerOS will score it against ATS systems in seconds, then guide you through the rest of your job search.",
      actions: [
        {
          id: "upload-resume",
          label: "Upload your resume",
          description: "Takes under a minute",
          href: "/resume",
        },
      ],
    };
  }

  if (!latestAnalysis) {
    return {
      headline: "Your resume is in — let's score it.",
      detail:
        "CareerOS hasn't run an ATS analysis on your latest resume yet. Run one now to unlock your Career Health Score and personalized recommendations.",
      actions: [
        {
          id: "view-resume",
          label: "Run ATS analysis",
          description: "See your score and a full breakdown",
          href: "/resume",
        },
      ],
    };
  }

  const breakdown = AtsScoreBreakdownSchema.safeParse(
    latestAnalysis.breakdown,
  );
  const weakest = breakdown.success
    ? (Object.entries(breakdown.data) as [
        keyof typeof breakdown.data,
        number,
      ][]
      ).sort((a, b) => a[1] - b[1])[0]
    : null;

  const score = latestAnalysis.overallScore;
  const scoreTone =
    score >= 80 ? "strong" : score >= 50 ? "solid" : "early-stage";

  return {
    headline:
      scoreTone === "strong"
        ? targetRole
          ? `Your resume is in strong shape for ${targetRole} roles.`
          : "Your resume is in strong shape."
        : scoreTone === "solid"
          ? "Your resume is solid — a few fixes could push it higher."
          : "Your resume needs some attention before you start applying.",
    detail: weakest
      ? `Your latest ATS score is ${score}/100. The weakest area is ${DIMENSION_LABEL[weakest[0]].toLowerCase()} at ${weakest[1]}/100 — that's the highest-leverage place to improve next.`
      : `Your latest ATS score is ${score}/100.`,
    actions: [
      {
        id: "view-resume",
        label: "View full breakdown",
        description: "See every dimension and suggested fixes",
        href: "/resume",
      },
    ],
  };
}
