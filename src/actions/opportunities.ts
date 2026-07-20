"use server";

import { revalidatePath } from "next/cache";

import { verifySession } from "@/lib/auth/dal";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getLatestParsedResume } from "@/features/resume/queries";
import { analyzeJobMatchAction } from "@/features/career-intelligence/jobs/job-match-analysis/actions";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";
import type { JobMatchAnalysisOutput } from "@/features/career-intelligence/jobs/job-match-analysis/types";
import {
  getResumeMatchProfile,
  saveOpportunity,
  searchOpportunities,
  updateOpportunityChecklist,
  updateOpportunityCustomQuestions,
  updateOpportunityNotes,
  updateOpportunityStatus,
  type SearchOpportunitiesResult,
} from "@/features/opportunities/service";
import { computeOpportunityScoreV2 } from "@/features/opportunities/score";
import type { OpportunityScoreV2Factors } from "@/features/discovery/types";
import {
  OpportunitySearchInputSchema,
  SaveOpportunityInputSchema,
  UpdateChecklistInputSchema,
  UpdateCustomQuestionsInputSchema,
  UpdateNotesInputSchema,
  UpdateStatusInputSchema,
} from "@/features/opportunities/schema";
import type { Opportunity } from "@/generated/prisma/client";
import type { DataActionResult } from "@/types/action";

function toActionError(
  error: unknown,
  fallbackMessage: string,
): DataActionResult<never> {
  if (error instanceof AppError) {
    return { status: "error", message: error.message };
  }

  logger.error("opportunities.action_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  return { status: "error", message: fallbackMessage };
}

export async function searchOpportunitiesAction(
  input: unknown,
): Promise<DataActionResult<SearchOpportunitiesResult>> {
  const user = await verifySession();

  const parsed = OpportunitySearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That search wasn't valid." };
  }

  try {
    const resumeProfile = await getResumeMatchProfile(user.id);
    const result = await searchOpportunities(parsed.data, resumeProfile);
    return { status: "success", data: result };
  } catch (error) {
    return toActionError(error, "We couldn't run that search. Please try again.");
  }
}

export async function saveOpportunityAction(
  input: unknown,
): Promise<DataActionResult<Opportunity>> {
  const user = await verifySession();

  const parsed = SaveOpportunityInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That opportunity wasn't valid." };
  }

  try {
    const opportunity = await saveOpportunity(user.id, parsed.data);
    revalidatePath("/opportunities");
    return { status: "success", data: opportunity };
  } catch (error) {
    return toActionError(error, "We couldn't save that opportunity.");
  }
}

export async function updateOpportunityStatusAction(
  input: unknown,
): Promise<DataActionResult<Opportunity>> {
  const user = await verifySession();

  const parsed = UpdateStatusInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That status wasn't valid." };
  }

  try {
    const opportunity = await updateOpportunityStatus(user.id, parsed.data);
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    revalidatePath("/opportunities");
    return { status: "success", data: opportunity };
  } catch (error) {
    return toActionError(error, "We couldn't update that status.");
  }
}

export async function updateOpportunityChecklistAction(
  input: unknown,
): Promise<DataActionResult<Opportunity>> {
  const user = await verifySession();

  const parsed = UpdateChecklistInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That checklist wasn't valid." };
  }

  try {
    const opportunity = await updateOpportunityChecklist(user.id, parsed.data);
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: opportunity };
  } catch (error) {
    return toActionError(error, "We couldn't update the checklist.");
  }
}

export async function updateOpportunityCustomQuestionsAction(
  input: unknown,
): Promise<DataActionResult<Opportunity>> {
  const user = await verifySession();

  const parsed = UpdateCustomQuestionsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "Those questions weren't valid." };
  }

  try {
    const opportunity = await updateOpportunityCustomQuestions(user.id, parsed.data);
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: opportunity };
  } catch (error) {
    return toActionError(error, "We couldn't save those questions.");
  }
}

export async function updateOpportunityNotesAction(
  input: unknown,
): Promise<DataActionResult<Opportunity>> {
  const user = await verifySession();

  const parsed = UpdateNotesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "That update wasn't valid." };
  }

  try {
    const opportunity = await updateOpportunityNotes(user.id, parsed.data);
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`);
    return { status: "success", data: opportunity };
  } catch (error) {
    return toActionError(error, "We couldn't save those notes.");
  }
}

/**
 * The AI-powered deep match analysis for the Application Workspace page —
 * reuses the real `analyzeJobMatch` Career Intelligence service (the same
 * one the dashboard's Job Match card uses), not a bespoke opportunities-only
 * AI call. Deliberately separate from the deterministic per-card score in
 * `match.ts`: this is a single on-demand call for one specific opportunity
 * a user has already committed to, not something run for every search
 * result.
 */
export async function getOpportunityMatchAnalysisAction(
  jobDescription: string,
): Promise<AnalysisActionResult<JobMatchAnalysisOutput>> {
  const user = await verifySession();

  const resume = await getLatestParsedResume(user.id);
  if (!resume?.rawText) {
    return {
      status: "error",
      message:
        "Upload and parse a resume first — CareerOS uses it to ground this analysis in your real experience.",
    };
  }

  if (!jobDescription.trim()) {
    return {
      status: "error",
      message: "This opportunity has no description to analyze against.",
    };
  }

  return analyzeJobMatchAction({
    resumeText: resume.rawText,
    jobDescription: jobDescription.trim(),
  });
}

/** Module 12 — Career Opportunity Score V2 for one saved opportunity. No
 * AI call of its own beyond whatever's already cached (Discovery's
 * original ranking, Company Research) — purely code-computed, so no
 * entitlement gate is needed. */
export async function getOpportunityScoreV2Action(
  opportunityId: string,
): Promise<DataActionResult<{ factors: OpportunityScoreV2Factors; overallScore: number }>> {
  const user = await verifySession();

  try {
    const result = await computeOpportunityScoreV2(opportunityId, user.id);
    return { status: "success", data: result };
  } catch (error) {
    return toActionError(error, "We couldn't compute this opportunity's score.");
  }
}

/** Shape the Discovery page's Server Component passes down as a prop
 * (fetched directly via `getAllProviders()` there, not through an action —
 * this type is what ties that server-side fetch to the client component's
 * props). */
export interface ProviderAvailability {
  id: string;
  name: string;
  configured: boolean;
}
