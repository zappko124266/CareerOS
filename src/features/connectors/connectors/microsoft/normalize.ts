import type { MicrosoftIdentity, MicrosoftUserInfoResponse } from "./types";

/**
 * This connector has no job data to normalize — Microsoft job search is
 * unsupported (see `jobs.ts`). What it does normalize is identity: a pure
 * reshape of Microsoft Graph's `/me` response into the small shape this
 * connector and the Connection Dashboard actually use — same role as
 * Google's `normalizeGoogleIdentity`.
 *
 * `mail` is documented by Microsoft Graph as nullable (some personal
 * Microsoft accounts have no mailbox); `userPrincipalName` is Graph's own
 * documented fallback identifier and is used here rather than left
 * unhandled, since falling back to `null` when a real fallback field
 * exists on the response would be a worse, avoidable "Signed in" empty
 * state on the Connections page.
 */
export function normalizeMicrosoftIdentity(raw: MicrosoftUserInfoResponse): MicrosoftIdentity {
  return {
    email: raw.mail ?? raw.userPrincipalName ?? null,
    name: raw.displayName ?? null,
  };
}
