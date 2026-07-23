import { AppError } from "@/lib/errors";

/**
 * Microsoft Graph has no consumer-facing API for a job-seeker to search
 * jobs via their own Microsoft account — `User.Read`/`Calendars.Read`/
 * `Mail.Read` (this connector's actual scopes) grant nothing job-search
 * shaped, and Graph has no job-listing endpoint at all. This is a
 * separate, unrelated question from LinkedIn (which Microsoft owns as a
 * company but operates as an independent product with its own,
 * Partner-Program-gated API) — connecting a user's Microsoft/Outlook
 * account through *this* connector grants no access to LinkedIn data or
 * LinkedIn's job search, and this connector must never be treated as a
 * backdoor into LinkedIn. See `docs/connectors/CONNECTOR_MASTER_PLAN.md`
 * and `CONNECTOR_CAPABILITY_MATRIX.md` for LinkedIn's own, separate,
 * unstarted entry.
 *
 * Per the `JobConnector` contract's own guidance ("implement as a
 * rejection... never a fabricated success") and this codebase's
 * "no placeholder portal logic" rule — the same standard already applied
 * to Google's `jobs.ts` — both methods below throw immediately and
 * honestly rather than returning `[]`/`null` (indistinguishable from
 * "searched and found nothing") or a fabricated result.
 * `microsoftConnector.capabilities` also does not claim job-search
 * support, so nothing in this codebase should call these at all — this
 * is the deliberate, documented backstop if something does.
 */
export class MicrosoftJobsNotSupportedError extends AppError {
  constructor() {
    super(
      "MICROSOFT_JOBS_NOT_SUPPORTED",
      "The Microsoft connector doesn't support job search — Microsoft Graph has no consumer API for this.",
    );
    this.name = "MicrosoftJobsNotSupportedError";
  }
}

export async function searchMicrosoftJobs(): Promise<never> {
  throw new MicrosoftJobsNotSupportedError();
}

export async function getMicrosoftJob(): Promise<never> {
  throw new MicrosoftJobsNotSupportedError();
}

/** "No Apply" — same rejection, since Easy Apply requires the same
 * nonexistent job-search capability as a prerequisite (same pattern as
 * Google's `applyToGoogleJob`). */
export async function applyToMicrosoftJob(): Promise<never> {
  throw new MicrosoftJobsNotSupportedError();
}
