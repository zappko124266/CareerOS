import "server-only";

import { extractMeetingLink } from "@/features/calendar/normalize";
import type {
  CreateCalendarEventInput,
  ListEventsParams,
  NormalizedCalendar,
  NormalizedCalendarAttendee,
  NormalizedCalendarEvent,
  NormalizedCalendarEventStatus,
  UpdateCalendarEventInput,
} from "@/features/calendar/types";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
/** The private extended-property key CareerOS writes on every event it
 * creates — read back by `toNormalizedEvent` into
 * `NormalizedCalendarEvent.createdByCareerOS`. Real Google Calendar API
 * feature (`extendedProperties.private`), not a fabricated marker. */
const CAREEROS_MARKER_KEY = "createdByCareerOS";

export class GoogleCalendarApiError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("GOOGLE_CALENDAR_API_ERROR", message, options);
    this.name = "GoogleCalendarApiError";
  }
}

async function calendarFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("google_connector.calendar_request_failed", {
      path,
      method: init?.method ?? "GET",
      status: response.status,
      detail,
    });
    throw new GoogleCalendarApiError(`Google Calendar API request failed (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

interface GoogleCalendarListResponse {
  items?: { id: string; summary?: string; primary?: boolean }[];
}

export async function listGoogleCalendars(accessToken: string): Promise<NormalizedCalendar[]> {
  const result = await calendarFetch<GoogleCalendarListResponse>(accessToken, "/users/me/calendarList");
  return (result.items ?? []).map((item) => ({
    id: item.id,
    name: item.summary ?? item.id,
    isPrimary: item.primary === true,
  }));
}

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEventAttendee {
  email?: string;
  displayName?: string;
  responseStatus?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: GoogleEventAttendee[];
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  status?: string;
  htmlLink?: string;
  extendedProperties?: { private?: Record<string, string> };
}

function attendeeResponse(raw: string | undefined): NormalizedCalendarAttendee["responseStatus"] {
  switch (raw) {
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "tentative":
      return "tentative";
    case "needsAction":
      return "needsAction";
    default:
      return "unknown";
  }
}

function eventStatus(raw: string | undefined): NormalizedCalendarEventStatus {
  if (raw === "cancelled") return "cancelled";
  if (raw === "tentative") return "tentative";
  return "confirmed";
}

/** Prefers Google's own structured conferencing fields
 * (`hangoutLink`/`conferenceData`) over text-scanning — see
 * `features/calendar/normalize.ts`'s own doc comment on why. Falls back
 * to scanning `location`/`description` only when neither structured
 * field is present (a Zoom/Webex link a user pasted in manually). */
function resolveMeetingLink(event: GoogleCalendarEvent): { url: string | null; platform: string | null } {
  if (event.hangoutLink) return { url: event.hangoutLink, platform: "Google Meet" };

  const conferenceUri = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri;
  if (conferenceUri) return { url: conferenceUri, platform: null };

  const fromText = extractMeetingLink(`${event.location ?? ""} ${event.description ?? ""}`);
  return fromText ? { url: fromText.url, platform: fromText.platform } : { url: null, platform: null };
}

/** All-day events (`start.date` with no `start.dateTime`) have no
 * meaningful single time and are excluded — an interview is never an
 * all-day event, and treating one as if it started at midnight would be
 * a fabricated time, not a real one. */
function toNormalizedEvent(calendarId: string, event: GoogleCalendarEvent): NormalizedCalendarEvent | null {
  if (!event.start?.dateTime || !event.end?.dateTime) return null;

  const { url, platform } = resolveMeetingLink(event);

  return {
    id: event.id,
    calendarId,
    title: event.summary ?? "(no title)",
    description: event.description ?? null,
    location: event.location ?? null,
    start: new Date(event.start.dateTime),
    end: new Date(event.end.dateTime),
    timezone: event.start.timeZone ?? null,
    attendees: (event.attendees ?? []).map((attendee) => ({
      email: attendee.email ?? null,
      name: attendee.displayName ?? null,
      responseStatus: attendeeResponse(attendee.responseStatus),
    })),
    meetingLink: url,
    meetingPlatform: platform,
    status: eventStatus(event.status),
    htmlLink: event.htmlLink ?? null,
    createdByCareerOS: event.extendedProperties?.private?.[CAREEROS_MARKER_KEY] === "true",
  };
}

export async function listGoogleCalendarEvents(
  accessToken: string,
  params: ListEventsParams,
): Promise<NormalizedCalendarEvent[]> {
  const calendarId = params.calendarId ?? "primary";
  const query = new URLSearchParams({
    timeMin: params.timeMinISO,
    timeMax: params.timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(params.maxResults ?? 50),
  });

  const result = await calendarFetch<{ items?: GoogleCalendarEvent[] }>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,
  );

  return (result.items ?? [])
    .map((event) => toNormalizedEvent(calendarId, event))
    .filter((event): event is NormalizedCalendarEvent => event !== null);
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  input: CreateCalendarEventInput,
): Promise<NormalizedCalendarEvent> {
  const calendarId = input.calendarId ?? "primary";

  const body = {
    summary: input.title,
    description: input.description,
    location: input.location,
    start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
    end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
    attendees: input.attendeeEmails?.map((email) => ({ email })),
    // Real Google Calendar API feature — marks this event as
    // CareerOS-created so a later sync can recognize it even if the
    // local `Interview.createdByCareerOS` row were ever lost (Hard Lock
    // 18's belt-and-suspenders — see this file's own top-level comment).
    extendedProperties: { private: { [CAREEROS_MARKER_KEY]: "true" } },
  };

  const event = await calendarFetch<GoogleCalendarEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
  );

  const normalized = toNormalizedEvent(calendarId, event);
  if (!normalized) {
    throw new GoogleCalendarApiError("Google Calendar returned an event with no start/end time after creation.");
  }
  return normalized;
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<NormalizedCalendarEvent> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.summary = input.title;
  if (input.description !== undefined) body.description = input.description;
  if (input.location !== undefined) body.location = input.location;
  if (input.start !== undefined) body.start = { dateTime: input.start.toISOString(), timeZone: input.timezone };
  if (input.end !== undefined) body.end = { dateTime: input.end.toISOString(), timeZone: input.timezone };

  const event = await calendarFetch<GoogleCalendarEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );

  const normalized = toNormalizedEvent(calendarId, event);
  if (!normalized) {
    throw new GoogleCalendarApiError("Google Calendar returned an event with no start/end time after update.");
  }
  return normalized;
}

export async function deleteGoogleCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  await calendarFetch<void>(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}
