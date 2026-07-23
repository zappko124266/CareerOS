import "server-only";

import { getApplicationResumeText } from "@/features/applications/service";
import {
  analyzeAnswerFeedback,
  analyzeInterviewFeedback,
  analyzeInterviewReadiness,
} from "@/features/career-intelligence/interview";
import { analyzeCompanyMatch } from "@/features/career-intelligence/jobs";
import { getOwnedOpportunityOrThrow } from "@/features/opportunities/queries";
import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { Interview, Prisma } from "@/generated/prisma/client";

import {
  getOwnedInterviewOrThrow,
  getOwnedInterviewPrepOrThrow,
  listOwnedOffersOrThrow,
} from "./queries";
import type {
  AddInterviewNoteInput,
  CreateInterviewInput,
  InterviewFeedbackAnalysis,
  InterviewStage,
  OfferComparisonResult,
  UpdateInterviewInput,
  UpsertOfferInput,
} from "./types";

export async function createInterview(
  userId: string,
  input: CreateInterviewInput,
): Promise<Interview> {
  const opportunity = await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  return prisma.interview.create({
    data: {
      opportunityId: opportunity.id,
      recruiterId: input.recruiterId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      roundLabel: input.roundLabel,
      stageHistory: [
        { stage: "APPLIED", changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

/** The one place any code path is allowed to change an interview's stage
 * — mirrors `transitionOpportunityStatus`'s exact append-only discipline
 * (`features/applications/service.ts`) so `stageHistory` can never drift
 * out of sync with `stage`. */
export async function transitionInterviewStage(
  interview: Interview,
  nextStage: InterviewStage,
): Promise<Interview> {
  const history = (interview.stageHistory ?? []) as Array<{
    stage: string;
    changedAt: string;
  }>;

  return prisma.interview.update({
    where: { id: interview.id },
    data: {
      stage: nextStage,
      stageHistory: [
        ...history,
        { stage: nextStage, changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateInterviewStage(
  userId: string,
  interviewId: string,
  stage: InterviewStage,
): Promise<Interview> {
  const interview = await getOwnedInterviewOrThrow(interviewId, userId);
  return transitionInterviewStage(interview, stage);
}

export async function updateInterview(
  userId: string,
  input: UpdateInterviewInput,
): Promise<Interview> {
  await getOwnedInterviewOrThrow(input.interviewId, userId);

  return prisma.interview.update({
    where: { id: input.interviewId },
    data: {
      recruiterId: input.recruiterId,
      scheduledAt:
        input.scheduledAt === undefined
          ? undefined
          : input.scheduledAt
            ? new Date(input.scheduledAt)
            : null,
      roundLabel: input.roundLabel,
      feedback: input.feedback,
      difficultyRating: input.difficultyRating,
    },
  });
}

/** Module 6 — AI Interview Coach. Reuses `analyzeInterviewReadiness`
 * as-is (built in an earlier sprint, never wired to any UI until now) —
 * grounded in the same resume/job-description pair every other
 * Application Studio AI feature uses. A new row per generation, same
 * versioned convention as `ApplicationStrategy`. */
export async function generateInterviewPrep(
  userId: string,
  interviewId: string,
  interviewType?: "behavioral" | "technical" | "mixed",
) {
  const interview = await getOwnedInterviewOrThrow(interviewId, userId);
  const resumeText = await getApplicationResumeText(interview.opportunity, userId);

  const result = await analyzeInterviewReadiness({
    resumeText,
    jobDescription: interview.opportunity.description,
    interviewType,
  });

  return prisma.interviewPrep.create({
    data: {
      interviewId,
      likelyQuestions: result.likelyQuestions as unknown as Prisma.InputJsonValue,
      starAnswerSuggestions: result.suggestedTalkingPoints,
      improvementSuggestions: result.areasToStrengthen,
      confidenceScore: Math.round(result.readinessScore),
      preparationChecklist: result.areasToStrengthen.map((area) => `Prepare for: ${area}`),
      aiModel: "ai-router",
    },
  });
}

/** Critiques one practice answer and appends it to the flags on the prep
 * it belongs to — only ever populated once the user actually submits an
 * answer, never a guess at what they might say. */
export async function generateAnswerFeedback(
  userId: string,
  interviewPrepId: string,
  question: string,
  userAnswer: string,
) {
  const prep = await getOwnedInterviewPrepOrThrow(interviewPrepId, userId);

  const result = await analyzeAnswerFeedback({
    question,
    userAnswer,
    jobDescription: prep.interview.opportunity.description,
  });

  const existingFlags = (prep.weakAnswerFlags ?? []) as Array<{
    question: string;
    answer: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvedAnswer: string;
  }>;

  const updatedFlags = [
    ...existingFlags,
    {
      question,
      answer: userAnswer,
      score: result.score,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      improvedAnswer: result.improvedAnswer,
    },
  ];

  return prisma.interviewPrep.update({
    where: { id: interviewPrepId },
    data: { weakAnswerFlags: updatedFlags as unknown as Prisma.InputJsonValue },
  });
}

/** Gives `InterviewNote` — schema-level groundwork since an earlier
 * sprint, with zero write path anywhere until now — its first real one.
 * Optionally attaches to a specific `Interview` round. */
export async function addInterviewNote(userId: string, input: AddInterviewNoteInput) {
  const opportunity = await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  if (input.interviewId) {
    await getOwnedInterviewOrThrow(input.interviewId, userId);
  }

  return prisma.interviewNote.create({
    data: {
      opportunityId: opportunity.id,
      interviewId: input.interviewId,
      note: input.note,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      documentType: input.documentType,
      documentUrl: input.documentUrl,
    },
  });
}

/** Module 9 — Interview Feedback Intelligence. Requires the user to have
 * already entered `feedback` on this interview (via `updateInterview`) —
 * never analyzes an empty note. Reuses the new `analyzeInterviewFeedback`
 * Career Intelligence service (same `createAnalysisService` factory every
 * other AI Router call in this module goes through) and persists the
 * result onto the interview itself, same "new row vs. in-place update"
 * judgment as `updateInterview` (a feedback note is edited in place, not
 * versioned like `InterviewPrep`). */
export async function analyzeInterviewFeedbackForInterview(
  userId: string,
  interviewId: string,
): Promise<Interview> {
  const interview = await getOwnedInterviewOrThrow(interviewId, userId);
  if (!interview.feedback?.trim()) {
    throw new ValidationError("Add your interview feedback notes before requesting an analysis.");
  }

  const result = await analyzeInterviewFeedback({
    roundLabel: interview.roundLabel ?? undefined,
    jobDescription: interview.opportunity.description,
    feedback: interview.feedback,
  });

  const feedbackAnalysis: InterviewFeedbackAnalysis = result;

  return prisma.interview.update({
    where: { id: interviewId },
    data: { feedbackAnalysis: feedbackAnalysis as unknown as Prisma.InputJsonValue },
  });
}

// ---------------------------------------------------------------------------
// Offers (Module 9)
// ---------------------------------------------------------------------------

/** User-entered real offer terms — updated in place if renegotiated, not
 * versioned (see `Offer`'s own doc comment for why). */
export async function upsertOffer(userId: string, input: UpsertOfferInput) {
  const opportunity = await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  const data = {
    baseSalary: input.baseSalary,
    bonus: input.bonus,
    equityDetails: input.equityDetails,
    currency: input.currency,
    benefits: input.benefits,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    notes: input.notes,
  };

  return prisma.offer.upsert({
    where: { opportunityId: opportunity.id },
    create: { opportunityId: opportunity.id, ...data },
    update: data,
  });
}

export async function deleteOffer(userId: string, opportunityId: string): Promise<void> {
  await getOwnedOpportunityOrThrow(opportunityId, userId);
  await prisma.offer.deleteMany({ where: { opportunityId } });
}

function normalizedScore(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

/**
 * Module 9 — Offer Comparison. Compensation, benefits-count, and remote
 * are computed deterministically in code from real, user-entered offer
 * terms; culture/growth fit reuses `analyzeCompanyMatch` (grounded in the
 * company's own cached AI research summary, when one exists) — same
 * "AI only scores the genuinely fuzzy factor" discipline as
 * `features/discovery/ranking.ts`. `overallScore` is always this
 * function's own average of `available` factors, never a number the AI
 * reports directly.
 */
export async function compareOffers(
  userId: string,
  opportunityIds: string[],
): Promise<OfferComparisonResult[]> {
  const opportunities = await listOwnedOffersOrThrow(opportunityIds, userId);
  const withOffers = opportunities.filter((opportunity) => opportunity.offer);

  if (withOffers.length < 2) {
    throw new ValidationError(
      "Record offer terms for at least 2 of these opportunities before comparing.",
    );
  }

  const totalComps = withOffers.map(
    (opportunity) => (opportunity.offer!.baseSalary ?? 0) + (opportunity.offer!.bonus ?? 0),
  );
  const maxTotalComp = Math.max(...totalComps);
  const benefitCounts = withOffers.map((opportunity) =>
    Array.isArray(opportunity.offer!.benefits) ? (opportunity.offer!.benefits as unknown[]).length : 0,
  );
  const maxBenefits = Math.max(...benefitCounts);

  const resumeText = await getApplicationResumeText(withOffers[0], userId).catch(() => null);

  const results: OfferComparisonResult[] = [];

  for (const opportunity of withOffers) {
    const offer = opportunity.offer!;
    const totalComp = (offer.baseSalary ?? 0) + (offer.bonus ?? 0);
    const compensationAvailable = maxTotalComp > 0;
    const benefitsCount = Array.isArray(offer.benefits) ? (offer.benefits as unknown[]).length : 0;

    let cultureScore = 0;
    let cultureAvailable = false;
    let cultureExplanation = "No resume on file to compare culture fit against.";

    if (resumeText) {
      const company = opportunity.companyId
        ? await prisma.company.findUnique({ where: { id: opportunity.companyId } })
        : null;

      if (company?.aiSummary) {
        const match = await analyzeCompanyMatch({
          resumeText,
          companyName: opportunity.companyName,
          companyDescription: company.aiSummary,
        });
        cultureScore = match.cultureFitScore;
        cultureAvailable = true;
        cultureExplanation =
          match.alignmentPoints[0] ?? "Culture fit assessed from the company's research summary.";
      } else {
        cultureExplanation = "No company research generated yet for this company.";
      }
    }

    results.push({
      opportunityId: opportunity.id,
      companyName: opportunity.companyName,
      overallScore: 0,
      factors: {
        compensation: {
          score: compensationAvailable ? normalizedScore(totalComp, maxTotalComp) : 0,
          explanation: compensationAvailable
            ? `Total comp (base + bonus): ${totalComp.toLocaleString()}${offer.currency ? ` ${offer.currency}` : ""}`
            : "No base salary or bonus entered for any compared offer.",
          available: compensationAvailable,
        },
        benefits: {
          score: maxBenefits > 0 ? normalizedScore(benefitsCount, maxBenefits) : 0,
          explanation: `${benefitsCount} benefit${benefitsCount === 1 ? "" : "s"} listed.`,
          available: maxBenefits > 0,
        },
        remote: {
          score: opportunity.remote ? 100 : 50,
          explanation: opportunity.remote ? "Fully remote." : "Not listed as remote.",
          available: true,
        },
        cultureAndGrowth: {
          score: cultureScore,
          explanation: cultureExplanation,
          available: cultureAvailable,
        },
      },
    });
  }

  for (const result of results) {
    const availableFactors = Object.values(result.factors).filter((factor) => factor.available);
    result.overallScore = availableFactors.length
      ? Math.round(
          availableFactors.reduce((sum, factor) => sum + factor.score, 0) / availableFactors.length,
        )
      : 0;
  }

  return results;
}
