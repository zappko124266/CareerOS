import { AppError } from "@/lib/errors";

/**
 * Google has no consumer-facing API for a job-seeker to search jobs via
 * their own Google account. Cloud Talent Solution (Google's only
 * job-search-shaped API) is an enterprise product for employers to index
 * *their own* postings for *their own* career site — it has no directory
 * of public job listings and no scope an individual OAuth user could
 * grant to search one. There is nothing real for `searchJobs`/`getJob`
 * to call.
 *
 * Per the `JobConnector` contract's own guidance ("implement as a
 * rejection... never a fabricated success") and this codebase's
 * "no placeholder portal logic" rule, both methods below throw
 * immediately and honestly rather than returning `[]`/`null` (which would
 * look indistinguishable from "searched and found nothing") or fabricated
 * results. `googleConnector.capabilities` also does not claim job-search
 * support, so nothing in this codebase should call these at all — this
 * is the deliberate, documented backstop if something does.
 */
export class GoogleJobsNotSupportedError extends AppError {
  constructor() {
    super(
      "GOOGLE_JOBS_NOT_SUPPORTED",
      "The Google connector doesn't support job search — Google has no consumer API for this.",
    );
    this.name = "GoogleJobsNotSupportedError";
  }
}

export async function searchGoogleJobs(): Promise<never> {
  throw new GoogleJobsNotSupportedError();
}

export async function getGoogleJob(): Promise<never> {
  throw new GoogleJobsNotSupportedError();
}

/** "No Apply" (Sprint 7, item 5) — same rejection, since Easy Apply
 * requires the same nonexistent job-search capability as a prerequisite. */
export async function applyToGoogleJob(): Promise<never> {
  throw new GoogleJobsNotSupportedError();
}
