import "server-only";

import { createInterviewEvent, deleteInterviewEvent, updateInterviewEvent } from "@/features/calendar/manager";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { ConnectionProvider, Interview } from "@/generated/prisma/client";

/** No explicit end time is ever extracted (Gmail/calendar sources give a
 * start time, rarely a duration) — a disclosed, real default, not a
 * fabricated one; the *start* time this default is applied to is always
 * real. */
const DEFAULT_INTERVIEW_DURATION_MS = 60 * 60 * 1000;

/**
 * Step 4/5/7's "Create/Update/Delete CareerOS interview events" — the
 * only file in this codebase that calls
 * `features/calendar/manager.ts`'s write operations, and the only place
 * Hard Lock 18 ("never write to or delete a user's own calendar events")
 * is enforced in code: every update/cancel call below checks
 * `interview.createdByCareerOS` before doing anything, and simply
 * declines (returns `false`) otherwise — never throws past that check in
 * a way that could be mistaken for a real failure worth retrying.
 */
export async function createCalendarEventForInterview(
  userId: string,
  interview: Interview,
  opportunity: { title: string; companyName: string },
  provider: ConnectionProvider,
  timezone: string,
): Promise<Interview | null> {
  if (!interview.scheduledAt) return null;

  const result = await createInterviewEvent(userId, provider, {
    title: `Interview — ${opportunity.title} at ${opportunity.companyName}`,
    description: interview.roundLabel ?? undefined,
    start: interview.scheduledAt,
    end: new Date(interview.scheduledAt.getTime() + DEFAULT_INTERVIEW_DURATION_MS),
    timezone,
  });

  if (result.status !== "OK") {
    logger.error("interview_intelligence.create_calendar_event_failed", {
      interviewId: interview.id,
      status: result.status,
      error: "error" in result ? result.error : undefined,
    });
    return null;
  }

  return prisma.interview.update({
    where: { id: interview.id },
    data: {
      calendarProvider: provider,
      calendarId: result.data.calendarId,
      calendarEventId: result.data.id,
      createdByCareerOS: true,
      timezone,
      meetingLink: interview.meetingLink ?? result.data.meetingLink,
      meetingPlatform: interview.meetingPlatform ?? result.data.meetingPlatform,
    },
  });
}

export async function updateCalendarEventForInterview(
  userId: string,
  interview: Interview,
  changes: { start?: Date; end?: Date; title?: string; timezone?: string },
): Promise<boolean> {
  if (!interview.calendarEventId || !interview.calendarProvider || !interview.calendarId) return false;
  if (!interview.createdByCareerOS) return false; // Hard Lock 18

  const result = await updateInterviewEvent(
    userId,
    interview.calendarProvider,
    interview.calendarId,
    interview.calendarEventId,
    {
      title: changes.title,
      start: changes.start,
      end: changes.end,
      timezone: changes.timezone ?? interview.timezone ?? undefined,
    },
    { confirmedCareerOsOwned: true },
  );

  return result.status === "OK";
}

export async function cancelCalendarEventForInterview(userId: string, interview: Interview): Promise<boolean> {
  if (!interview.calendarEventId || !interview.calendarProvider || !interview.calendarId) return false;
  if (!interview.createdByCareerOS) return false; // Hard Lock 18

  const result = await deleteInterviewEvent(
    userId,
    interview.calendarProvider,
    interview.calendarId,
    interview.calendarEventId,
    { confirmedCareerOsOwned: true },
  );

  return result.status === "OK";
}
