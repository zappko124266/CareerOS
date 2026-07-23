import "server-only";
import { createHash } from "crypto";

/**
 * The Fingerprint Engine — Sprint 19. A **different, complementary**
 * concept from `dedupe.ts`'s existing `computeListingFingerprint`
 * (`"${companyName}|${title}"`, used only as a loose *cross-source*
 * duplicate lookup key — reused as-is, never modified, see that file's
 * own doc comment). This fingerprint is the sync engine's own
 * *identity+content* signature for one specific `(source, sourceId)`
 * listing across repeated syncs — deterministic (a pure function of
 * normalized fields, never a random id) and stable across runs, so two
 * consecutive fetches of the *same real listing* with *no real change*
 * always produce the same fingerprint, and any real change to an
 * identity/content field always produces a different one.
 *
 * Built from Node's built-in `crypto` (SHA-256) — no new dependency.
 */
export interface OpportunityFingerprintFields {
  source: string;
  sourceId: string;
  companyName: string;
  title: string;
  location: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function computeOpportunityFingerprint(fields: OpportunityFingerprintFields): string {
  const parts = [
    normalize(fields.source),
    normalize(fields.sourceId),
    normalize(fields.companyName),
    normalize(fields.title),
    normalize(fields.location),
    normalize(fields.employmentType),
    fields.salaryMin ?? "",
    fields.salaryMax ?? "",
  ];

  return createHash("sha256").update(parts.join("|")).digest("hex");
}
