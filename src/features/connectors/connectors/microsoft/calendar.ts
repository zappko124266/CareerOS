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

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
/** A fixed, stable GUID namespace for the `singleValueExtendedProperties`
 * marker Microsoft Graph requires (`String {guid} Name <name>` — Graph's
 * own real extended-property addressing format, not a CareerOS
 * invention). Any valid GUID works as long as it's used consistently. */
const CAREEROS_PROPERTY_ID = "String {f3a1c2e4-6b8d-4e2a-9c3f-1a2b3c4d5e6f} Name CreatedByCareerOS";
/** Microsoft Graph returns event times in the organizer's original
 * Windows timezone name by default (e.g. "Pacific Standard Time"), not
 * IANA. Requesting UTC via this header — Graph's own documented
 * mechanism (`Prefer: outlook.timezone`) — normalizes every returned
 * time to a real, unambiguous instant instead of requiring this codebase
 * to carry a Windows-timezone-name lookup table it has no other use for.
 * Google's events (`connectors/google/calendar.ts`), by contrast,
 * natively report a real IANA zone — the asymmetry is real and
 * documented here rather than hidden. */
const TIMEZONE_PREFERENCE_HEADER = { Prefer: 'outlook.timezone="UTC"' };

export class MicrosoftCalendarApiError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("MICROSOFT_CALENDAR_API_ERROR", message, options);
    this.name = "MicrosoftCalendarApiError";
  }
}

async function graphFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GRAPH_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error("microsoft_connector.calendar_request_failed", {
      path,
      method: init?.method ?? "GET",
      status: response.status,
      detail,
    });
    throw new MicrosoftCalendarApiError(`Microsoft Graph Calendar request failed (${response.status}).`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

interface GraphCalendarListResponse {
  value?: { id: string; name?: string; isDefaultCalendar?: boolean }[];
}

export async function listMicrosoftCalendars(accessToken: string): Promise<NormalizedCalendar[]> {
  const result = await graphFetch<GraphCalendarListResponse>(accessToken, "/me/calendars");
  return (result.value ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? item.id,
    isPrimary: item.isDefaultCalendar === true,
  }));
}

interface GraphDateTimeTimeZone {
  dateTime?: string;
  timeZone?: string;
}

interface GraphAttendee {
  emailAddress?: { address?: string; name?: string };
  status?: { response?: string };
}

interface GraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  location?: { displayName?: string };
  start?: GraphDateTimeTimeZone;
  end?: GraphDateTimeTimeZone;
  attendees?: GraphAttendee[];
  onlineMeeting?: { joinUrl?: string };
  isCancelled?: boolean;
  webLink?: string;
  singleValueExtendedProperties?: { id: string; value: string }[];
}

function attendeeResponse(raw: string | undefined): NormalizedCalendarAttendee["responseStatus"] {
  switch (raw) {
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
    case "tentativelyAccepted":
      return "tentative";
    case "notResponded":
      return "needsAction";
    default:
      return "unknown";
  }
}

function eventStatus(event: GraphEvent): NormalizedCalendarEventStatus {
  return event.isCancelled ? "cancelled" : "confirmed";
}

function resolveMeetingLink(event: GraphEvent): { url: string | null; platform: string | null } {
  if (event.onlineMeeting?.joinUrl) {
    return { url: event.onlineMeeting.joinUrl, platform: "Microsoft Teams" };
  }

  const fromText = extractMeetingLink(`${event.location?.displayName ?? ""} ${event.bodyPreview ?? ""}`);
  return fromText ? { url: fromText.url, platform: fromText.platform } : { url: null, platform: null };
}

function toNormalizedEvent(calendarId: string, event: GraphEvent): NormalizedCalendarEvent | null {
  if (!event.start?.dateTime || !event.end?.dateTime) return null;

  const { url, platform } = resolveMeetingLink(event);
  const marker = event.singleValueExtendedProperties?.find((property) => property.id === CAREEROS_PROPERTY_ID);

  return {
    id: event.id,
    calendarId,
    title: event.subject ?? "(no title)",
    description: event.bodyPreview ?? null,
    location: event.location?.displayName ?? null,
    // `Prefer: outlook.timezone="UTC"` (set on every read call below)
    // means `dateTime` here is already UTC without a trailing "Z" —
    // Graph's own documented format for that header.
    start: new Date(`${event.start.dateTime}Z`),
    end: new Date(`${event.end.dateTime}Z`),
    timezone: event.start.timeZone ?? null,
    attendees: (event.attendees ?? []).map((attendee) => ({
      email: attendee.emailAddress?.address ?? null,
      name: attendee.emailAddress?.name ?? null,
      responseStatus: attendeeResponse(attendee.status?.response),
    })),
    meetingLink: url,
    meetingPlatform: platform,
    status: eventStatus(event),
    htmlLink: event.webLink ?? null,
    createdByCareerOS: marker?.value === "true",
  };
}

export async function listMicrosoftCalendarEvents(
  accessToken: string,
  params: ListEventsParams,
): Promise<NormalizedCalendarEvent[]> {
  const calendarId = params.calendarId ?? "primary";
  const query = new URLSearchParams({
    startDateTime: params.timeMinISO,
    endDateTime: params.timeMaxISO,
    $top: String(params.maxResults ?? 50),
    $select: "id,subject,bodyPreview,location,start,end,attendees,onlineMeeting,isCancelled,webLink,singleValueExtendedProperties",
  });

  const path =
    calendarId === "primary"
      ? `/me/calendarView?${query.toString()}`
      : `/me/calendars/${encodeURIComponent(calendarId)}/calendarView?${query.toString()}`;

  const result = await graphFetch<{ value?: GraphEvent[] }>(accessToken, path, {
    headers: TIMEZONE_PREFERENCE_HEADER,
  });

  return (result.value ?? [])
    .map((event) => toNormalizedEvent(calendarId, event))
    .filter((event): event is NormalizedCalendarEvent => event !== null);
}

function eventsPath(calendarId: string, eventId?: string): string {
  const base = calendarId === "primary" ? "/me/events" : `/me/calendars/${encodeURIComponent(calendarId)}/events`;
  return eventId ? `${base}/${encodeURIComponent(eventId)}` : base;
}

export async function createMicrosoftCalendarEvent(
  accessToken: string,
  input: CreateCalendarEventInput,
): Promise<NormalizedCalendarEvent> {
  const calendarId = input.calendarId ?? "primary";

  const body = {
    subject: input.title,
    body: input.description ? { contentType: "text", content: input.description } : undefined,
    location: input.location ? { displayName: input.location } : undefined,
    start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
    end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
    attendees: input.attendeeEmails?.map((email) => ({ emailAddress: { address: email } })),
    // Real Graph extended-property mechanism — see this file's own
    // top-level comment.
    singleValueExtendedProperties: [{ id: CAREEROS_PROPERTY_ID, value: "true" }],
  };

  const event = await graphFetch<GraphEvent>(accessToken, eventsPath(calendarId), {
    method: "POST",
    body: JSON.stringify(body),
    headers: TIMEZONE_PREFERENCE_HEADER,
  });

  const normalized = toNormalizedEvent(calendarId, event);
  if (!normalized) {
    throw new MicrosoftCalendarApiError("Microsoft Graph returned an event with no start/end time after creation.");
  }
  return normalized;
}

export async function updateMicrosoftCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<NormalizedCalendarEvent> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body.subject = input.title;
  if (input.description !== undefined) body.body = { contentType: "text", content: input.description };
  if (input.location !== undefined) body.location = { displayName: input.location };
  if (input.start !== undefined) body.start = { dateTime: input.start.toISOString(), timeZone: input.timezone };
  if (input.end !== undefined) body.end = { dateTime: input.end.toISOString(), timeZone: input.timezone };

  const event = await graphFetch<GraphEvent>(accessToken, eventsPath(calendarId, eventId), {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: TIMEZONE_PREFERENCE_HEADER,
  });

  const normalized = toNormalizedEvent(calendarId, event);
  if (!normalized) {
    throw new MicrosoftCalendarApiError("Microsoft Graph returned an event with no start/end time after update.");
  }
  return normalized;
}

export async function deleteMicrosoftCalendarEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  await graphFetch<void>(accessToken, eventsPath(calendarId, eventId), { method: "DELETE" });
}
