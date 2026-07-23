import "server-only";

import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  listGoogleCalendarEvents,
  listGoogleCalendars,
  updateGoogleCalendarEvent,
} from "@/features/connectors/connectors/google/calendar";
import { isGoogleOAuthConfigured } from "@/features/connectors/connectors/google/oauth";
import { getValidAccessToken } from "@/features/connectors/manager";

import type { CalendarConnectResult, CalendarProviderAdapter } from "../contracts";

/**
 * Google's `CalendarProviderAdapter` — Step 4. Every method below is a
 * thin pass-through to `connectors/google/calendar.ts` (the real Calendar
 * API calls) or `connectors/manager.ts`'s `getValidAccessToken` (the
 * Universal Connector Framework's own OAuth/refresh) — no OAuth logic,
 * no token handling, and no Calendar-API-shape knowledge lives in this
 * file itself (Hard Lock 3).
 */
export const googleCalendarProvider: CalendarProviderAdapter = {
  id: "google",
  name: "Google",

  isConfigured(): boolean {
    return isGoogleOAuthConfigured();
  },

  async connect(userId: string): Promise<CalendarConnectResult> {
    const result = await getValidAccessToken(userId, "GOOGLE");
    if (result.status === "OK") return { status: "OK", accessToken: result.accessToken };
    if (result.status === "NOT_CONNECTED") return { status: "NOT_CONNECTED" };
    return { status: "REFRESH_FAILED", error: result.error };
  },

  // Real disconnection is owned by `disconnectConnectorAction` — see
  // `contracts.ts`'s own doc comment on this method.
  async disconnect(): Promise<void> {
    return;
  },

  listCalendars: listGoogleCalendars,
  listEvents: listGoogleCalendarEvents,
  createEvent: createGoogleCalendarEvent,
  updateEvent: updateGoogleCalendarEvent,
  deleteEvent: deleteGoogleCalendarEvent,
};
