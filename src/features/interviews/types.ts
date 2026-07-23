import type { z } from "zod";

import type {
  AddInterviewNoteInputSchema,
  AnalyzeInterviewFeedbackInputSchema,
  CompareOffersInputSchema,
  CreateInterviewInputSchema,
  DeleteOfferInputSchema,
  GenerateAnswerFeedbackInputSchema,
  GenerateInterviewPrepInputSchema,
  InterviewDocumentTypeSchema,
  InterviewStageSchema,
  UpdateInterviewInputSchema,
  UpdateInterviewStageInputSchema,
  UpsertOfferInputSchema,
} from "./schema";

export type InterviewStage = z.infer<typeof InterviewStageSchema>;
export type InterviewDocumentType = z.infer<typeof InterviewDocumentTypeSchema>;
export type CreateInterviewInput = z.infer<typeof CreateInterviewInputSchema>;
export type UpdateInterviewStageInput = z.infer<typeof UpdateInterviewStageInputSchema>;
export type UpdateInterviewInput = z.infer<typeof UpdateInterviewInputSchema>;
export type GenerateInterviewPrepInput = z.infer<typeof GenerateInterviewPrepInputSchema>;
export type GenerateAnswerFeedbackInput = z.infer<typeof GenerateAnswerFeedbackInputSchema>;
export type UpsertOfferInput = z.infer<typeof UpsertOfferInputSchema>;
export type DeleteOfferInput = z.infer<typeof DeleteOfferInputSchema>;
export type CompareOffersInput = z.infer<typeof CompareOffersInputSchema>;
export type AddInterviewNoteInput = z.infer<typeof AddInterviewNoteInputSchema>;
export type AnalyzeInterviewFeedbackInput = z.infer<typeof AnalyzeInterviewFeedbackInputSchema>;

/** Sprint 20 — the exact shape `analyzeInterviewFeedback`
 * (`career-intelligence/interview/feedback-analysis/`) returns, persisted
 * as-is onto `Interview.feedbackAnalysis`. */
export interface InterviewFeedbackAnalysis {
  strengths: string[];
  weaknesses: string[];
  followUpAdvice: string[];
  nextStageProbability: number;
}

export const INTERVIEW_STAGE_ORDER: InterviewStage[] = [
  "APPLIED",
  "SCREENING",
  "TECHNICAL",
  "MANAGER",
  "HR",
  "FINAL",
  "OFFER",
  "ACCEPTED",
];

export const INTERVIEW_STAGE_OFF_PATH: InterviewStage[] = ["REJECTED", "WITHDRAWN"];

export const INTERVIEW_STAGE_LABEL: Record<InterviewStage, string> = {
  APPLIED: "Applied",
  SCREENING: "Screening",
  TECHNICAL: "Technical",
  MANAGER: "Manager",
  HR: "HR",
  FINAL: "Final",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export interface OfferComparisonFactor {
  score: number;
  explanation: string;
  available: boolean;
}

export interface OfferComparisonResult {
  opportunityId: string;
  companyName: string;
  overallScore: number;
  factors: {
    compensation: OfferComparisonFactor;
    benefits: OfferComparisonFactor;
    remote: OfferComparisonFactor;
    cultureAndGrowth: OfferComparisonFactor;
  };
}
