import "server-only";

import { prisma } from "@/lib/prisma";
import type { Interview, InterviewMeetingStatus, InterviewStage, Prisma } from "@/generated/prisma/client";

/**
 * The Interview Tracker — Step 10. `transitionMeetingStatus` mirrors
 * `features/interviews/service.ts`'s existing `transitionInterviewStage`
 * exactly: the only writer of `meetingStatus`, always appending to
 * `meetingStatusHistory` in the same append-only shape `stageHistory`
 * already uses, so a meeting's real lifecycle (Scheduled → Rescheduled →
 * Completed, or → Cancelled) is always fully reconstructable.
 */
export async function transitionMeetingStatus(interview: Interview, nextStatus: InterviewMeetingStatus): Promise<Interview> {
  const history = (interview.meetingStatusHistory ?? []) as Array<{ status: string; changedAt: string }>;

  return prisma.interview.update({
    where: { id: interview.id },
    data: {
      meetingStatus: nextStatus,
      meetingStatusHistory: [
        ...history,
        { status: nextStatus, changedAt: new Date().toISOString() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Step 13's exact vocabulary ("Preparing Interview," "Interview Today,"
 * ...), derived — never stored as its own column, the same "derive,
 * don't duplicate" discipline `features/autonomous-agent/status.ts`
 * already established for `AgentStatus`. The Autonomous Career Agent
 * consumes this as one more real input signal rather than re-deriving
 * interview lifecycle logic itself.
 */
export type InterviewLifecycleLabel =
  | "PREPARING"
  | "SCHEDULED"
  | "INTERVIEW_TODAY"
  | "INTERVIEW_TOMORROW"
  | "WAITING_FEEDBACK"
  | "OFFER_PENDING"
  | "OFFER_RECEIVED"
  | "REJECTED"
  | "CANCELLED";

export function deriveInterviewLifecycleLabel(
  interview: { stage: InterviewStage; meetingStatus: InterviewMeetingStatus; scheduledAt: Date | null },
  hasOffer: boolean,
  now: Date,
): InterviewLifecycleLabel {
  if (interview.stage === "REJECTED" || interview.stage === "WITHDRAWN") return "REJECTED";
  if (hasOffer) return "OFFER_RECEIVED";
  if (interview.stage === "OFFER" || interview.stage === "ACCEPTED") return "OFFER_PENDING";
  if (interview.meetingStatus === "CANCELLED") return "CANCELLED";
  if (interview.meetingStatus === "COMPLETED") return "WAITING_FEEDBACK";

  if (interview.scheduledAt) {
    if (interview.scheduledAt.toDateString() === now.toDateString()) return "INTERVIEW_TODAY";

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (interview.scheduledAt.toDateString() === tomorrow.toDateString()) return "INTERVIEW_TOMORROW";

    if (interview.scheduledAt.getTime() > now.getTime()) return "SCHEDULED";
  }

  return "PREPARING";
}
