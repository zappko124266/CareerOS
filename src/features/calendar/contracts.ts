import type {
  CreateCalendarEventInput,
  ListEventsParams,
  NormalizedCalendar,
  NormalizedCalendarEvent,
  UpdateCalendarEventInput,
} from "./types";

export interface CalendarConnectResult {
  status: "OK" | "NOT_CONNECTED" | "REFRESH_FAILED";
  accessToken?: string;
  error?: string;
}

/**
 * The Universal Calendar Provider contract — Step 3. Every provider
 * (Google, Microsoft, and any future one) implements this single
 * interface; nothing that discovers a calendar provider through
 * `registry.ts` needs a switch statement or provider-specific branch
 * (Hard Lock 9).
 *
 * `connect()`/`disconnect()` are deliberately thin — see each method's
 * own doc comment. Every other method takes an already-valid
 * `accessToken` as a plain argument rather than a `userId`, so this
 * contract has zero knowledge of the Universal Connector Framework's own
 * OAuth/token-refresh machinery (Hard Lock 3: that machinery is never
 * duplicated here, only called into by `connect()`).
 */
export interface CalendarProviderAdapter {
  readonly id: string;
  readonly name: string;

  isConfigured(): boolean;

  /**
   * Ensures a usable, fresh access token exists for calendar operations.
   * Delegates entirely to `features/connectors/manager.ts`'s
   * `getValidAccessToken` (the Universal Connector Framework's own
   * refresh flow) — this method contains no OAuth logic of its own and
   * never will (Hard Lock 3: "Never duplicate OAuth. Never duplicate
   * token refresh.").
   */
  connect(userId: string): Promise<CalendarConnectResult>;

  /**
   * Real, provider-side disconnection is already owned by
   * `disconnectConnectorAction` (Universal Connector Framework) — it
   * revokes/clears the underlying `AccountConnection` row regardless of
   * which capabilities (Gmail, Calendar) were granted. This method exists
   * only for calendar-specific local cleanup a future provider might
   * need; today, for both Google and Microsoft, there is none, so it's a
   * real, documented no-op — not a placeholder for OAuth revocation that
   * belongs here instead.
   */
  disconnect(userId: string): Promise<void>;

  listCalendars(accessToken: string): Promise<NormalizedCalendar[]>;
  listEvents(accessToken: string, params: ListEventsParams): Promise<NormalizedCalendarEvent[]>;
  createEvent(accessToken: string, input: CreateCalendarEventInput): Promise<NormalizedCalendarEvent>;
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    input: UpdateCalendarEventInput,
  ): Promise<NormalizedCalendarEvent>;
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
}
