/**
 * The Normalized Calendar Model — Step 3. Same role for calendars that
 * `NormalizedJob`/`NormalizedOpportunity` already play for job search
 * (`features/opportunities/providers/types.ts`,
 * `features/connectors/types.ts`): one shape every provider's raw API
 * response gets mapped onto, so nothing downstream of the registry ever
 * sees a Google- or Microsoft-specific field name (Hard Lock 9).
 */

export interface NormalizedCalendar {
  id: string;
  name: string;
  isPrimary: boolean;
}

export type CalendarAttendeeResponse = "accepted" | "declined" | "tentative" | "needsAction" | "unknown";

export interface NormalizedCalendarAttendee {
  email: string | null;
  name: string | null;
  responseStatus: CalendarAttendeeResponse;
}

export type NormalizedCalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export interface NormalizedCalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  /** IANA timezone the provider reported for `start`, when it reported
   * one — never guessed from the user's browser/profile locale. */
  timezone: string | null;
  attendees: NormalizedCalendarAttendee[];
  /** A structured conferencing link the provider itself exposes
   * (Google's `hangoutLink`/`conferenceData`, Microsoft's
   * `onlineMeeting.joinUrl`) — preferred over text-scanning
   * `location`/`description` when present, since it's the provider's own
   * authoritative field, not a regex guess. */
  meetingLink: string | null;
  meetingPlatform: string | null;
  status: NormalizedCalendarEventStatus;
  /** Link to view this event in the provider's own web UI, when the
   * provider returns one — real, never constructed by guessing a URL
   * pattern. */
  htmlLink: string | null;
  /** Read back from the event's own provider-side metadata
   * (`extendedProperties`/`singleValueExtendedProperties` — see each
   * provider's `calendar.ts`), not inferred — `true` only when *this*
   * event actually carries the marker CareerOS itself writes on
   * `createEvent()`. A second, provider-side confirmation of what this
   * codebase's own `Interview.createdByCareerOS` column already tracks,
   * useful if the local row is ever missing (Hard Lock 18). */
  createdByCareerOS: boolean;
}

export interface ListEventsParams {
  timeMinISO: string;
  timeMaxISO: string;
  /** Defaults to the primary calendar when omitted. */
  calendarId?: string;
  maxResults?: number;
}

export interface CreateCalendarEventInput {
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  /** Required — every real calendar create call needs an explicit IANA
   * timezone, never assumed. */
  timezone: string;
  attendeeEmails?: string[];
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  location?: string;
  start?: Date;
  end?: Date;
  timezone?: string;
}
