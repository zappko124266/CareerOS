import { z } from "zod";

/** Mirrors `RecruiterInteractionType` in `prisma/schema.prisma`. */
export const RecruiterInteractionTypeSchema = z.enum([
  "VIEWED_PROFILE",
  "CONTACTED",
  "REPLIED",
  "INTERVIEW_REQUESTED",
  "REJECTED",
  "GHOSTED",
  "HIRED",
]);

export const CreateRecruiterInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  companyId: z.uuid().optional(),
  title: z.string().trim().max(200).optional(),
  linkedinUrl: z.string().trim().max(500).optional(),
  email: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const UpdateRecruiterInputSchema = CreateRecruiterInputSchema.extend({
  recruiterId: z.uuid(),
});

export const DeleteRecruiterInputSchema = z.object({
  recruiterId: z.uuid(),
});

export const LogRecruiterInteractionInputSchema = z.object({
  recruiterId: z.uuid(),
  opportunityId: z.uuid().optional(),
  type: RecruiterInteractionTypeSchema,
  note: z.string().trim().max(2000).optional(),
  occurredAt: z.iso.datetime().optional(),
});

export const DeleteRecruiterInteractionInputSchema = z.object({
  interactionId: z.uuid(),
});
