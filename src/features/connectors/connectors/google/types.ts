/** One Google OAuth scope this connector requests, labeled for display
 * in the Connection Dashboard ("Jobs, Calendar, Gmail" — Sprint 7, item
 * 4). There is deliberately no "jobs" scope: Google has no consumer API
 * for a job-seeker to search jobs via their own account (Cloud Talent
 * Solution is an enterprise product for employers indexing their own
 * postings) — see `jobs.ts`. */
export interface GoogleOAuthScope {
  scope: string;
  label: "Identity" | "Calendar" | "Gmail";
}

export const GOOGLE_OAUTH_SCOPES: GoogleOAuthScope[] = [
  { scope: "openid", label: "Identity" },
  { scope: "email", label: "Identity" },
  { scope: "profile", label: "Identity" },
  { scope: "https://www.googleapis.com/auth/calendar.readonly", label: "Calendar" },
  // Sprint 17 (Calendar Intelligence) — `calendar.readonly` above only
  // covers listing calendars/events; creating, updating, and deleting
  // *CareerOS-owned* interview events needs this narrower, real
  // least-privilege scope (not the broader `calendar` scope, which would
  // also grant calendar/settings management CareerOS never needs).
  { scope: "https://www.googleapis.com/auth/calendar.events", label: "Calendar" },
  { scope: "https://www.googleapis.com/auth/gmail.readonly", label: "Gmail" },
];

/** Google's token endpoint response — https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code */
export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

/** Google's userinfo endpoint response — https://developers.google.com/identity/openid-connect/openid-connect#obtaininguserprofileinformation */
export interface GoogleUserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Pure reshape of `GoogleUserInfoResponse` — see `normalize.ts`. */
export interface GoogleIdentity {
  email: string | null;
  name: string | null;
}
