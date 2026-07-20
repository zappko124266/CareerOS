import type { NormalizedOpportunity } from "./types";

/**
 * RemoteOK and Arbeitnow both return `description` as raw HTML (headings,
 * lists, bold tags), not plain text — rendered directly it shows literal
 * `<p>`/`<strong>` markup to the user, and fed directly into the AI match
 * prompt it pollutes what the model sees. Stripped to plain text here, at
 * normalization time, so every downstream consumer (card display, the
 * Overview tab, the AI Match Analysis prompt) gets clean text without
 * each needing to know which providers require it.
 *
 * Deliberately tag-stripping rather than rendering as HTML
 * (`dangerouslySetInnerHTML`) — this is untrusted third-party content, and
 * a plain-text description loses only visual formatting, not
 * information, while avoiding XSS risk entirely.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Shared across every adapter: none of the four providers reliably report
 * a job/internship/contract/freelance distinction as a first-class field,
 * so this is a best-effort keyword heuristic applied consistently rather
 * than each adapter guessing differently. Defaults to "JOB" — the
 * conservative choice when nothing matches.
 */
export function guessOpportunityType(
  title: string,
  description: string,
): NormalizedOpportunity["type"] {
  const text = `${title} ${description}`.toLowerCase();

  if (/\bintern(ship)?\b/.test(text)) return "INTERNSHIP";
  if (/\bfreelance\b/.test(text)) return "FREELANCE";
  if (/\bcontract(or)?\b/.test(text)) return "CONTRACT";
  return "JOB";
}
