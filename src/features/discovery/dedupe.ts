import "server-only";

/**
 * Module 6 — Duplicate Engine. `fingerprint` is a normalized
 * `"${companyName}|${title}"` — lowercased, trimmed, whitespace-collapsed
 * — used only to *look up* candidate cross-source matches quickly; it is
 * never itself unique-constrained, since two real, distinct roles can
 * legitimately share one (e.g. two different "Software Engineer" openings
 * at the same company). The actual "is this really the same job" decision
 * is made in `run-discovery.ts` by requiring a match on this fingerprint
 * AND a different `source` AND a nearby posting date — see
 * `DUPLICATE_MATCH_WINDOW_MS` below.
 */
export function computeListingFingerprint(companyName: string, title: string): string {
  return `${companyName}|${title}`
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Two listings posted within this window of each other, sharing a
 * fingerprint, from different sources, are treated as the same real-world
 * job — wide enough to catch a listing that a re-poster or aggregator
 * surfaces a few days apart, narrow enough that two unrelated same-titled
 * roles posted months apart at the same company aren't wrongly merged. */
export const DUPLICATE_MATCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
