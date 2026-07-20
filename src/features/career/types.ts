import type { z } from "zod";

import type {
  CreateLearningItemInputSchema,
  DeleteLearningItemInputSchema,
  LearningItemStatusSchema,
  UpdateCareerGoalInputSchema,
  UpdateLearningItemInputSchema,
} from "./schema";

export type UpdateCareerGoalInput = z.infer<typeof UpdateCareerGoalInputSchema>;
export type LearningItemStatus = z.infer<typeof LearningItemStatusSchema>;
export type CreateLearningItemInput = z.infer<typeof CreateLearningItemInputSchema>;
export type UpdateLearningItemInput = z.infer<typeof UpdateLearningItemInputSchema>;
export type DeleteLearningItemInput = z.infer<typeof DeleteLearningItemInputSchema>;

export const LEARNING_ITEM_STATUS_LABEL: Record<LearningItemStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

/** One entry in the unified Career Timeline (Module 10) — a thin,
 * read-only view over rows that already exist in `Resume`, `Opportunity`,
 * `Interview`, `Offer`, and `LearningItem`. Never its own stored table;
 * see `buildUnifiedTimeline`'s doc comment. */
export interface TimelineEntry {
  id: string;
  type:
    | "resume_uploaded"
    | "application_status_changed"
    | "interview_stage_changed"
    | "offer_received"
    | "learning_completed";
  title: string;
  description: string;
  occurredAt: Date;
  href?: string;
}

export interface CareerHealthFactor {
  score: number | null;
  explanation: string;
}

export interface CareerHealthResultV2 {
  overallScore: number;
  interviewReadiness: CareerHealthFactor;
  resumeQuality: CareerHealthFactor;
  linkedinQuality: CareerHealthFactor;
  skillReadiness: CareerHealthFactor;
  marketReadiness: CareerHealthFactor;
  companyReadiness: CareerHealthFactor;
  growthReadiness: CareerHealthFactor;
}
