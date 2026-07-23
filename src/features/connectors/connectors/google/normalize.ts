import type { GoogleIdentity, GoogleUserInfoResponse } from "./types";

/**
 * This connector has no job data to normalize — Google Jobs search is
 * unsupported (see `jobs.ts`). What it does normalize is identity: a pure
 * reshape of Google's userinfo response into the small shape this
 * connector and the Connection Dashboard actually use.
 */
export function normalizeGoogleIdentity(raw: GoogleUserInfoResponse): GoogleIdentity {
  return {
    email: raw.email ?? null,
    name: raw.name ?? null,
  };
}
