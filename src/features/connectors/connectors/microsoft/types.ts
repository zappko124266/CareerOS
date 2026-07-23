/** One Microsoft OAuth scope this connector requests, labeled for
 * display in the Connection Dashboard — same shape and purpose as
 * Google's `GoogleOAuthScope` (`connectors/google/types.ts`). There is
 * deliberately no job-search scope: Microsoft Graph has no consumer API
 * for a job-seeker to search jobs via their own account — see `jobs.ts`.
 * `offline_access` is required to receive a `refresh_token` at all on the
 * Microsoft identity platform's v2.0 endpoint (unlike Google, which
 * returns one by default for the first consent) — it is a protocol scope,
 * not a data-access grant, so it's labeled "Identity" alongside the
 * actual identity scopes rather than shown as its own row. */
export interface MicrosoftOAuthScope {
  scope: string;
  label: "Identity" | "Calendar" | "Outlook Mail";
}

export const MICROSOFT_OAUTH_SCOPES: MicrosoftOAuthScope[] = [
  { scope: "openid", label: "Identity" },
  { scope: "profile", label: "Identity" },
  { scope: "email", label: "Identity" },
  { scope: "offline_access", label: "Identity" },
  { scope: "User.Read", label: "Identity" },
  // Sprint 17 (Calendar Intelligence) — upgraded from `Calendars.Read`:
  // creating/updating/deleting *CareerOS-owned* interview events needs
  // write access to the user's own calendars. `Calendars.ReadWrite`
  // (not the `.Shared` variants) is Microsoft Graph's real
  // least-privilege scope for exactly this.
  { scope: "Calendars.ReadWrite", label: "Calendar" },
  { scope: "Mail.Read", label: "Outlook Mail" },
];

/** The Microsoft identity platform v2.0 token endpoint's response —
 * https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow#successful-response-2 */
export interface MicrosoftTokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
  refresh_token?: string;
  id_token?: string;
}

/** Microsoft Graph's `/me` response (the fields this connector actually
 * reads) — https://learn.microsoft.com/en-us/graph/api/user-get. `mail`
 * is documented as nullable (accounts without a mailbox, common for some
 * personal Microsoft accounts, return `null`); `userPrincipalName` is
 * always present and is Graph's own documented fallback identifier. */
export interface MicrosoftUserInfoResponse {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string;
}

/** Pure reshape of `MicrosoftUserInfoResponse` — see `normalize.ts`. */
export interface MicrosoftIdentity {
  email: string | null;
  name: string | null;
}
