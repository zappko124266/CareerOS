import "server-only";

import {
  createMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
  listMicrosoftCalendarEvents,
  listMicrosoftCalendars,
  updateMicrosoftCalendarEvent,
} from "@/features/connectors/connectors/microsoft/calendar";
import { isMicrosoftOAuthConfigured } from "@/features/connectors/connectors/microsoft/oauth";
import { getValidAccessToken } from "@/features/connectors/manager";

import type { CalendarConnectResult, CalendarProviderAdapter } from "../contracts";

/**
 * Microsoft's `CalendarProviderAdapter` — Step 5. Same shape as
 * `providers/google.ts`, same reuse discipline: every method is a
 * pass-through to `connectors/microsoft/calendar.ts` (real Graph API
 * calls) or the Universal Connector Framework's own
 * `getValidAccessToken`. No duplicated OAuth, no duplicated Calendar
 * contract logic — this file is the entire "Microsoft plugs into the
 * Universal Calendar Framework" story.
 */
export const microsoftCalendarProvider: CalendarProviderAdapter = {
  id: "microsoft",
  name: "Microsoft",

  isConfigured(): boolean {
    return isMicrosoftOAuthConfigured();
  },

  async connect(userId: string): Promise<CalendarConnectResult> {
    const result = await getValidAccessToken(userId, "MICROSOFT");
    if (result.status === "OK") return { status: "OK", accessToken: result.accessToken };
    if (result.status === "NOT_CONNECTED") return { status: "NOT_CONNECTED" };
    return { status: "REFRESH_FAILED", error: result.error };
  },

  async disconnect(): Promise<void> {
    return;
  },

  listCalendars: listMicrosoftCalendars,
  listEvents: listMicrosoftCalendarEvents,
  createEvent: createMicrosoftCalendarEvent,
  updateEvent: updateMicrosoftCalendarEvent,
  deleteEvent: deleteMicrosoftCalendarEvent,
};
