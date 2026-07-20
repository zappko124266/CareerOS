import { z } from "zod";

/** Mirrors `InterviewStage` in `prisma/schema.prisma`. */
export const InterviewStageSchema = z.enum([
  "APPLIED",
  "SCREENING",
  "TECHNICAL",
  "MANAGER",
  "HR",
  "FINAL",
  "OFFER",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
]);

export const CreateInterviewInputSchema = z.object({
  opportunityId: z.uuid(),
  recruiterId: z.uuid().optional(),
  scheduledAt: z.iso.datetime().optional(),
  roundLabel: z.string().trim().max(200).optional(),
});

export const UpdateInterviewStageInputSchema = z.object({
  interviewId: z.uuid(),
  stage: InterviewStageSchema,
});

export const UpdateInterviewInputSchema = z.object({
  interviewId: z.uuid(),
  recruiterId: z.uuid().nullable().optional(),
  scheduledAt: z.iso.datetime().nullable().optional(),
  roundLabel: z.string().trim().max(200).nullable().optional(),
  feedback: z.string().trim().max(4000).nullable().optional(),
  difficultyRating: z.number().int().min(1).max(5).nullable().optional(),
});

export const GenerateInterviewPrepInputSchema = z.object({
  interviewId: z.uuid(),
  interviewType: z.enum(["behavioral", "technical", "mixed"]).optional(),
});

export const GenerateAnswerFeedbackInputSchema = z.object({
  interviewPrepId: z.uuid(),
  question: z.string().trim().min(1),
  userAnswer: z.string().trim().min(1),
});

export const UpsertOfferInputSchema = z.object({
  opportunityId: z.uuid(),
  baseSalary: z.number().int().min(0).optional(),
  bonus: z.number().int().min(0).optional(),
  equityDetails: z.string().trim().max(1000).optional(),
  currency: z.string().trim().max(10).optional(),
  benefits: z.array(z.string().trim().min(1)).default([]),
  startDate: z.iso.datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const DeleteOfferInputSchema = z.object({
  opportunityId: z.uuid(),
});

export const CompareOffersInputSchema = z.object({
  opportunityIds: z.array(z.uuid()).min(2).max(5),
});

export const AddInterviewNoteInputSchema = z.object({
  opportunityId: z.uuid(),
  interviewId: z.uuid().optional(),
  note: z.string().trim().min(1, "Note can't be empty").max(4000),
  scheduledAt: z.iso.datetime().optional(),
});
