import "server-only";

import { listEvents } from "@/features/calendar/manager";
import { listCalendarProviders } from "@/features/calendar/registry";
import type { NormalizedCalendarEvent } from "@/features/calendar/types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { ConnectionProvider, Interview } from "@/generated/prisma/client";

import { computeBusyWindows, detectConflicts } from "./availability";
import { createCalendarEventForInterview } from "./calendar";
import { transitionMeetingStatus } from "./tracking";

const SYNC_WINDOW_PAST_MS = 7 * 24 * 60 * 60 * 1000;
const SYNC_WINDOW_FUTURE_MS = 30 * 24 * 60 * 60 * 1000;
/** How far in the future a Gmail-detected interview with no matching
 * calendar event can be before CareerOS will create one — bounded so a
 * far-future "maybe" date extracted with low confidence doesn't produce
 * a real calendar write. */
const EVENT_CREATION_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_INTERVIEW_DURATION_MS = 60 * 60 * 1000;

const GOOGLE_CALENDAR_READ_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GOOGLE_CALENDAR_WRITE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const MICROSOFT_CALENDAR_WRITE_SCOPE = "Calendars.ReadWrite";
/** How stale a user's last sync must be before they're due again — same
 * cadence rationale as Gmail Intelligence's own `SYNC_INTERVAL_MS`. */
const DUE_SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000;

export interface InterviewSyncSummary {
  eventsFetched: number;
  interviewsLinked: number;
  interviewsRescheduled: number;
  interviewsCancelled: number;
  interviewsCompleted: number;
  interviewsCreatedOnCalendar: number;
  conflictsDetected: number;
}

type FetchedEvent = NormalizedCalendarEvent & { provider: ConnectionProvider };

/** Real, per-provider fetch — a provider that isn't connected, needs
 * reconnecting, or errors is honestly skipped for this run (never
 * substituting fabricated events for what couldn't be fetched). */
async function fetchAllCalendarEvents(userId: string, now: Date): Promise<FetchedEvent[]> {
  const timeMinISO = new Date(now.getTime() - SYNC_WINDOW_PAST_MS).toISOString();
  const timeMaxISO = new Date(now.getTime() + SYNC_WINDOW_FUTURE_MS).toISOString();

  const results: FetchedEvent[] = [];
  for (const provider of listCalendarProviders()) {
    const providerEnum = provider.id.toUpperCase() as ConnectionProvider;
    const result = await listEvents(userId, providerEnum, { timeMinISO, timeMaxISO, maxResults: 100 });
    if (result.status === "OK") {
      results.push(...result.data.map((event) => ({ ...event, provider: providerEnum })));
    }
  }
  return results;
}

async function findWritableCalendarProvider(userId: string): Promise<ConnectionProvider | null> {
  const connections = await prisma.accountConnection.findMany({
    where: { userId, status: "CONNECTED", provider: { in: ["GOOGLE", "MICROSOFT"] } },
    select: { provider: true, scopes: true },
  });

  for (const connection of connections) {
    const scopes = connection.scopes as string[];
    if (connection.provider === "GOOGLE" && scopes.includes(GOOGLE_CALENDAR_WRITE_SCOPE)) return "GOOGLE";
    if (connection.provider === "MICROSOFT" && scopes.includes(MICROSOFT_CALENDAR_WRITE_SCOPE)) return "MICROSOFT";
  }
  return null;
}

/** Reconciles one already-calendar-linked `Interview` against the fresh
 * fetch — Step 6/11's "Detect updates, Detect cancellations, Refresh
 * interview status." */
async function reconcileLinkedInterview(
  interview: Interview,
  events: FetchedEvent[],
  now: Date,
  windowStart: Date,
  windowEnd: Date,
  summary: InterviewSyncSummary,
): Promise<void> {
  const matched = events.find(
    (event) =>
      event.provider === interview.calendarProvider &&
      event.calendarId === interview.calendarId &&
      event.id === interview.calendarEventId,
  );

  if (!matched) {
    // The event that should be in this window is gone — a real,
    // disclosed inference ("provider no longer reports it"), not a
    // fabricated one, and only made when the interview's own known time
    // actually fell inside the fetched window (otherwise this run simply
    // couldn't have seen it either way, so no conclusion is drawn).
    const wasInWindow = interview.scheduledAt && interview.scheduledAt >= windowStart && interview.scheduledAt <= windowEnd;
    if (wasInWindow && interview.meetingStatus !== "CANCELLED") {
      await transitionMeetingStatus(interview, "CANCELLED");
      summary.interviewsCancelled++;
    }
    return;
  }

  if (matched.status === "cancelled") {
    if (interview.meetingStatus !== "CANCELLED") {
      await transitionMeetingStatus(interview, "CANCELLED");
      summary.interviewsCancelled++;
    }
    return;
  }

  const timeChanged = !interview.scheduledAt || matched.start.getTime() !== interview.scheduledAt.getTime();
  if (timeChanged) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: { scheduledAt: matched.start, timezone: matched.timezone ?? interview.timezone },
    });
    await transitionMeetingStatus({ ...interview, scheduledAt: matched.start }, "RESCHEDULED");
    summary.interviewsRescheduled++;
  } else if (matched.end.getTime() <= now.getTime() && (interview.meetingStatus === "SCHEDULED" || interview.meetingStatus === "RESCHEDULED")) {
    await transitionMeetingStatus(interview, "COMPLETED");
    summary.interviewsCompleted++;
  }

  if (matched.meetingLink && matched.meetingLink !== interview.meetingLink) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: { meetingLink: matched.meetingLink, meetingPlatform: matched.meetingPlatform },
    });
  }
}

/**
 * Step 6/7's "Interview extraction" for the calendar side — a real,
 * conservative match: same calendar day as the interview's known
 * `scheduledAt`, and the opportunity's own company name appears in the
 * event's title or description. Deliberately never creates a brand-new
 * `Interview` purely from an unattributed calendar event (see this
 * module's own architecture note in the Sprint 17 report) — only links
 * to, or creates a calendar event for, an `Interview` row that already
 * exists (from a manual entry or a real Gmail-detected invitation).
 */
async function reconcileUnlinkedInterview(
  userId: string,
  interview: Interview & { opportunity: { title: string; companyName: string } },
  events: FetchedEvent[],
  now: Date,
  summary: InterviewSyncSummary,
): Promise<void> {
  if (!interview.scheduledAt) return;

  const companyName = interview.opportunity.companyName.toLowerCase();
  const match = events.find(
    (event) =>
      event.start.toDateString() === interview.scheduledAt!.toDateString() &&
      (event.title.toLowerCase().includes(companyName) || (event.description ?? "").toLowerCase().includes(companyName)),
  );

  if (match) {
    await prisma.interview.update({
      where: { id: interview.id },
      data: {
        calendarProvider: match.provider,
        calendarId: match.calendarId,
        calendarEventId: match.id,
        createdByCareerOS: match.createdByCareerOS,
        meetingLink: interview.meetingLink ?? match.meetingLink,
        meetingPlatform: interview.meetingPlatform ?? match.meetingPlatform,
        timezone: interview.timezone ?? match.timezone,
      },
    });
    summary.interviewsLinked++;
    return;
  }

  const withinCreationHorizon =
    interview.scheduledAt.getTime() > now.getTime() && interview.scheduledAt.getTime() <= now.getTime() + EVENT_CREATION_HORIZON_MS;
  if (!withinCreationHorizon) return;

  const writableProvider = await findWritableCalendarProvider(userId);
  if (!writableProvider) return;

  const created = await createCalendarEventForInterview(userId, interview, interview.opportunity, writableProvider, interview.timezone ?? "UTC");
  if (created) summary.interviewsCreatedOnCalendar++;
}

/** Step 9/12's Conflict Alerts — real interval overlap between a linked
 * interview and every *other* fetched busy window, persisted (Hard Lock
 * 7/8) rather than recomputed at read time. */
async function detectAndPersistConflicts(userId: string, events: FetchedEvent[], summary: InterviewSyncSummary): Promise<void> {
  const linkedInterviews = await prisma.interview.findMany({
    where: {
      opportunity: { userId },
      calendarEventId: { not: null },
      scheduledAt: { not: null },
      meetingStatus: { in: ["SCHEDULED", "RESCHEDULED"] },
    },
  });

  for (const interview of linkedInterviews) {
    if (!interview.scheduledAt) continue;

    const end = new Date(interview.scheduledAt.getTime() + DEFAULT_INTERVIEW_DURATION_MS);
    const otherBusyWindows = computeBusyWindows(events.filter((event) => event.id !== interview.calendarEventId));
    const conflictCheck = detectConflicts({ start: interview.scheduledAt, end }, otherBusyWindows);

    const conflictNote = conflictCheck.hasConflict
      ? `Overlaps with "${conflictCheck.conflictingEvents[0].title}" on your calendar.`
      : null;

    if (conflictCheck.hasConflict !== interview.hasConflict || conflictNote !== interview.conflictNote) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: { hasConflict: conflictCheck.hasConflict, conflictNote },
      });
      if (conflictCheck.hasConflict) summary.conflictsDetected++;
    }
  }
}

/**
 * Step 10/11's "who is due" query — reuses the Automation Engine's own
 * Execution History (`AuditLog`'s `automation.task_completed` rows,
 * already written by `executor.ts` for every task, `calendar_sync`
 * included) as the freshness signal, the same "no new table just to
 * track a timestamp" discipline `features/automation/history.ts` already
 * established. Only users with a `CONNECTED` Google or Microsoft
 * connection that actually granted a calendar-read scope are considered
 * eligible at all.
 */
export async function listUsersDueForCalendarSync(now: Date, limit: number): Promise<string[]> {
  const connections = await prisma.accountConnection.findMany({
    where: { provider: { in: ["GOOGLE", "MICROSOFT"] }, status: "CONNECTED" },
    select: { userId: true, provider: true, scopes: true },
  });

  const eligibleUserIds = new Set(
    connections
      .filter((connection) => {
        const scopes = connection.scopes as string[];
        if (connection.provider === "GOOGLE") return scopes.includes(GOOGLE_CALENDAR_READ_SCOPE);
        return scopes.includes(MICROSOFT_CALENDAR_WRITE_SCOPE);
      })
      .map((connection) => connection.userId),
  );

  if (eligibleUserIds.size === 0) return [];

  const recentRuns = await prisma.auditLog.findMany({
    where: {
      userId: { in: Array.from(eligibleUserIds) },
      action: "automation.task_completed",
      createdAt: { gte: new Date(now.getTime() - DUE_SYNC_INTERVAL_MS) },
    },
    select: { userId: true, metadata: true },
  });

  const recentlySyncedUserIds = new Set(
    recentRuns
      .filter((run) => (run.metadata as { taskId?: string } | null)?.taskId === "calendar_sync")
      .map((run) => run.userId)
      .filter((id): id is string => id !== null),
  );

  return Array.from(eligibleUserIds)
    .filter((userId) => !recentlySyncedUserIds.has(userId))
    .slice(0, limit);
}

/**
 * The real sync algorithm — Step 6/11. Fetches every connected
 * provider's events once, reconciles every relevant `Interview` row
 * against that one fetch (no per-interview API call), and persists every
 * conclusion. This is the only function `calendar_sync`
 * (`features/automation/tasks/calendar-sync.ts`) calls; it never runs
 * during a page render (Hard Lock 7).
 */
export async function syncCalendarForUser(userId: string, now: Date = new Date()): Promise<InterviewSyncSummary> {
  const events = await fetchAllCalendarEvents(userId, now);
  const windowStart = new Date(now.getTime() - SYNC_WINDOW_PAST_MS);
  const windowEnd = new Date(now.getTime() + SYNC_WINDOW_FUTURE_MS);

  const summary: InterviewSyncSummary = {
    eventsFetched: events.length,
    interviewsLinked: 0,
    interviewsRescheduled: 0,
    interviewsCancelled: 0,
    interviewsCompleted: 0,
    interviewsCreatedOnCalendar: 0,
    conflictsDetected: 0,
  };

  const interviews = await prisma.interview.findMany({
    where: {
      opportunity: { userId },
      OR: [{ calendarEventId: { not: null } }, { scheduledAt: { not: null } }],
    },
    include: { opportunity: { select: { title: true, companyName: true } } },
  });

  for (const interview of interviews) {
    try {
      if (interview.calendarEventId) {
        await reconcileLinkedInterview(interview, events, now, windowStart, windowEnd, summary);
      } else {
        await reconcileUnlinkedInterview(userId, interview, events, now, summary);
      }
    } catch (error) {
      logger.error("interview_intelligence.reconcile_failed", {
        interviewId: interview.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await detectAndPersistConflicts(userId, events, summary);

  return summary;
}
