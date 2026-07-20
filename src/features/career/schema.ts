import { z } from "zod";

export const UpdateCareerGoalInputSchema = z.object({
  targetRole: z.string().trim().max(200).optional(),
  targetCompanies: z.array(z.string().trim().min(1)).default([]),
  targetSalaryMin: z.number().int().min(0).optional(),
  targetSalaryMax: z.number().int().min(0).optional(),
  targetLocation: z.string().trim().max(200).optional(),
  targetTimeline: z.string().trim().max(200).optional(),
  remotePreference: z.string().trim().max(100).optional(),
});

export const LearningItemStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED"]);

export const CreateLearningItemInputSchema = z.object({
  skillOrTopic: z.string().trim().min(1, "Skill or topic is required").max(200),
  sourceUrl: z.string().trim().max(500).optional(),
});

export const UpdateLearningItemInputSchema = z.object({
  learningItemId: z.uuid(),
  status: LearningItemStatusSchema,
});

export const DeleteLearningItemInputSchema = z.object({
  learningItemId: z.uuid(),
});
