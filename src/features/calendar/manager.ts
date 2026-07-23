import "server-only";

import { logger } from "@/lib/logger";
import type { ConnectionProvider } from "@/generated/prisma/client";

import { getCalendarProvider } from "./registry";
import type {
  CreateCalendarEventInput,
  ListEventsParams,
  NormalizedCalendar,
  NormalizedCalendarEvent,
  UpdateCalendarEventInput,
} from "./types";

export type CalendarOperationResult<T> =
  | { status: "OK"; data: T }
  | { status: "NOT_CONNECTED" }
  | { status: "REFRESH_FAILED"; error: string }
  | { status: "PROVIDER_ERROR"; error: string };

function providerIdFor(provider: ConnectionProvider): string {
  return provider.toLowerCase();
}

/**
 * The Calendar Manager — the Universal Calendar Framework's single
 * coordination point for actually *doing* something with a provider
 * (same role `features/connectors/manager.ts` plays for the connector
 * layer generally). Every function here: looks the provider up in the
 * registry (never a switch statement), calls `connect()` to get a real,
 * fresh access token (delegating to the Universal Connector Framework's
 * own refresh flow), then calls the one real provider method needed —
 * wrapping any thrown provider error into the same typed result shape so
 * every caller (Interview Intelligence, the `calendar_sync` automation
 * task) handles "not connected"/"needs reconnect"/"provider error"
 * uniformly instead of each catching exceptions its own way.
 */
async function withCalendar<T>(
  userId: string,
  provider: ConnectionProvider,
  run: (accessToken: string) => Promise<T>,
): Promise<CalendarOperationResult<T>> {
  const adapter = getCalendarProvider(providerIdFor(provider));
  if (!adapter) return { status: "PROVIDER_ERROR", error: `No calendar provider registered for ${provider}.` };

  const connection = await adapter.connect(userId);
  if (connection.status === "NOT_CONNECTED") return { status: "NOT_CONNECTED" };
  if (connection.status === "REFRESH_FAILED" || !connection.accessToken) {
    return { status: "REFRESH_FAILED", error: connection.error ?? "Reconnect required." };
  }

  try {
    const data = await run(connection.accessToken);
    return { status: "OK", data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("calendar_manager.provider_call_failed", { userId, provider, message });
    return { status: "PROVIDER_ERROR", error: message };
  }
}

export async function listCalendars(userId: string, provider: ConnectionProvider): Promise<CalendarOperationResult<NormalizedCalendar[]>> {
  const adapter = getCalendarProvider(providerIdFor(provider));
  return withCalendar(userId, provider, (accessToken) => adapter!.listCalendars(accessToken));
}

export async function listEvents(
  userId: string,
  provider: ConnectionProvider,
  params: ListEventsParams,
): Promise<CalendarOperationResult<NormalizedCalendarEvent[]>> {
  const adapter = getCalendarProvider(providerIdFor(provider));
  return withCalendar(userId, provider, (accessToken) => adapter!.listEvents(accessToken, params));
}

/** Creates a real event on the user's calendar — only ever called by
 * Interview Intelligence when it has a confidently-known interview time
 * (Hard Lock 4: never a mock/placeholder scheduling call). The created
 * event is marked CareerOS-owned both locally (`Interview.createdByCareerOS`,
 * set by the caller after this returns) and provider-side (each
 * connector's `calendar.ts` sets its own real extended-property marker). */
export async function createInterviewEvent(
  userId: string,
  provider: ConnectionProvider,
  input: CreateCalendarEventInput,
): Promise<CalendarOperationResult<NormalizedCalendarEvent>> {
  const adapter = getCalendarProvider(providerIdFor(provider));
  return withCalendar(userId, provider, (accessToken) => adapter!.createEvent(accessToken, input));
}

/**
 * Updates a calendar event — `options.confirmedCareerOsOwned` must be
 * passed explicitly as `true` by every call site, a deliberate,
 * self-documenting friction point rather than a silent assumption: the
 * caller (`features/interviews/intelligence/calendar.ts`) is required to
 * have already checked `Interview.createdByCareerOS` before reaching
 * here (Hard Lock 18 — never write to an event CareerOS didn't create).
 */
export async function updateInterviewEvent(
  userId: string,
  provider: ConnectionProvider,
  calendarId: string,
  eventId: string,
  input: UpdateCalendarEventInput,
  options: { confirmedCareerOsOwned: true },
): Promise<CalendarOperationResult<NormalizedCalendarEvent>> {
  void options;
  const adapter = getCalendarProvider(providerIdFor(provider));
  return withCalendar(userId, provider, (accessToken) => adapter!.updateEvent(accessToken, calendarId, eventId, input));
}

/** Same `confirmedCareerOsOwned` contract as `updateInterviewEvent` —
 * this is the only path in this codebase that can ever delete a calendar
 * event, and it is never called on anything but a CareerOS-created one. */
export async function deleteInterviewEvent(
  userId: string,
  provider: ConnectionProvider,
  calendarId: string,
  eventId: string,
  options: { confirmedCareerOsOwned: true },
): Promise<CalendarOperationResult<true>> {
  void options;
  const adapter = getCalendarProvider(providerIdFor(provider));
  return withCalendar(userId, provider, async (accessToken) => {
    await adapter!.deleteEvent(accessToken, calendarId, eventId);
    return true as const;
  });
}
