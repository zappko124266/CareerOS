"use server";

import { verifySession } from "@/lib/auth/dal";
import { getLatestParsedResume } from "@/features/resume/queries";
import { analyzeJobMatchAction } from "@/features/career-intelligence/jobs/job-match-analysis/actions";
import { suggestCareerProgressionAction } from "@/features/career-intelligence/career/progression-suggestions/actions";
import { analyzeCareerTimelineAction } from "@/features/career-intelligence/career/timeline-analysis/actions";
import { analyzeSkillGapAction } from "@/features/career-intelligence/skills/skill-gap-analysis/actions";
import { estimateSalaryAction } from "@/features/career-intelligence/salary/salary-estimation/actions";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";
import type { CareerProgressionOutput } from "@/features/career-intelligence/career/progression-suggestions/types";
import type { CareerTimelineAnalysisOutput } from "@/features/career-intelligence/career/timeline-analysis/types";
import type { JobMatchAnalysisOutput } from "@/features/career-intelligence/jobs/job-match-analysis/types";
import type { SalaryEstimationOutput } from "@/features/career-intelligence/salary/salary-estimation/types";
import type { SkillGapAnalysisOutput } from "@/features/career-intelligence/skills/skill-gap-analysis/types";

/**
 * Every dashboard AI action fetches the caller's own latest resume text
 * server-side rather than trusting a client-supplied value — the client
 * only ever supplies the extra context CareerOS has no other way to know
 * (a target role, a job description, a pasted LinkedIn profile).
 */
async function getLatestResumeTextOrError(
  userId: string,
): Promise<{ resumeText: string } | { error: AnalysisActionResult<never> }> {
  const latestResume = await getLatestParsedResume(userId);

  if (!latestResume?.rawText) {
    return {
      error: {
        status: "error",
        message:
          "Upload and parse a resume first — CareerOS uses it to ground this analysis in your real experience.",
      },
    };
  }

  return { resumeText: latestResume.rawText };
}

export async function getCareerRecommendationsAction(): Promise<
  AnalysisActionResult<CareerProgressionOutput>
> {
  const user = await verifySession();
  const resumeResult = await getLatestResumeTextOrError(user.id);
  if ("error" in resumeResult) return resumeResult.error;

  return suggestCareerProgressionAction({
    resumeText: resumeResult.resumeText,
  });
}

export async function getSkillGapAction(
  targetRole: string,
): Promise<AnalysisActionResult<SkillGapAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getLatestResumeTextOrError(user.id);
  if ("error" in resumeResult) return resumeResult.error;

  if (!targetRole.trim()) {
    return { status: "error", message: "Enter a target role to analyze." };
  }

  return analyzeSkillGapAction({
    resumeText: resumeResult.resumeText,
    targetRole: targetRole.trim(),
  });
}

export async function getJobMatchAction(
  jobDescription: string,
): Promise<AnalysisActionResult<JobMatchAnalysisOutput>> {
  const user = await verifySession();
  const resumeResult = await getLatestResumeTextOrError(user.id);
  if ("error" in resumeResult) return resumeResult.error;

  if (!jobDescription.trim()) {
    return { status: "error", message: "Paste a job description to score against." };
  }

  return analyzeJobMatchAction({
    resumeText: resumeResult.resumeText,
    jobDescription: jobDescription.trim(),
  });
}

/** Module 10's AI narrative over the Career Timeline — reuses
 * `analyzeCareerTimeline` (built an earlier sprint, never wired to any UI
 * until now) exactly as-is. The code-computed unified timeline itself
 * (`buildUnifiedTimeline`, `features/career/timeline.ts`) never calls
 * this — it's a separate, on-demand narrative layer over the same resume
 * text every other dashboard card already reads. */
export async function getCareerTimelineNarrativeAction(): Promise<
  AnalysisActionResult<CareerTimelineAnalysisOutput>
> {
  const user = await verifySession();
  const resumeResult = await getLatestResumeTextOrError(user.id);
  if ("error" in resumeResult) return resumeResult.error;

  return analyzeCareerTimelineAction({ resumeText: resumeResult.resumeText });
}

export async function getSalaryEstimateAction(input: {
  role: string;
  location: string;
  yearsOfExperience: number;
  skills?: string[];
}): Promise<AnalysisActionResult<SalaryEstimationOutput>> {
  await verifySession();

  if (!input.role.trim() || !input.location.trim()) {
    return {
      status: "error",
      message: "Enter a role and location to estimate salary.",
    };
  }

  return estimateSalaryAction({
    role: input.role.trim(),
    location: input.location.trim(),
    yearsOfExperience: input.yearsOfExperience,
    skills: input.skills,
  });
}
