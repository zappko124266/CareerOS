/**
 * Meeting Link Intelligence — Step 8. Provider-agnostic on purpose: both
 * `connectors/google/calendar.ts` and `connectors/microsoft/calendar.ts`
 * call this for the same platform list, rather than each reimplementing
 * its own pattern list (Hard Lock 9's "provider-independent" applies to
 * this logic too, not just the adapter shape).
 *
 * Structured provider fields (Google's `hangoutLink`/`conferenceData`,
 * Microsoft's `onlineMeeting.joinUrl`) are always preferred by each
 * provider's own `calendar.ts` when present — `extractMeetingLink` here
 * is the real, disclosed fallback for everything else (a Zoom/Webex/Slack/
 * Skype link a user pasted into the event location or description, which
 * neither provider surfaces as a structured field since a third party
 * added it).
 */

const PLATFORM_PATTERNS: { pattern: RegExp; platform: string }[] = [
  { pattern: /meet\.google\.com/i, platform: "Google Meet" },
  { pattern: /teams\.microsoft\.com/i, platform: "Microsoft Teams" },
  { pattern: /(?:[\w-]+\.)?zoom\.us/i, platform: "Zoom" },
  { pattern: /(?:[\w-]+\.)?webex\.com/i, platform: "Webex" },
  { pattern: /slack\.com/i, platform: "Slack" },
  { pattern: /join\.skype\.com|skype\.com/i, platform: "Skype" },
];

/** `null` platform means "a real HTTPS link, just not one of the
 * recognized platforms above" — still a genuine, usable link, never
 * discarded just because it isn't one of the six named ones. */
export function recognizeMeetingPlatform(url: string): string | null {
  for (const { pattern, platform } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

const URL_PATTERN = /(https?:\/\/[^\s<>"')]+)/gi;

/**
 * Scans free text (a calendar event's `location`/`description`, or a
 * Gmail snippet) for the first URL that looks like a meeting link —
 * preferring a recognized platform if multiple URLs are present, but
 * falling back to the first generic HTTPS link rather than finding
 * nothing. Returns `null` when no URL is present at all — never
 * fabricates one.
 */
export function extractMeetingLink(text: string | null | undefined): { url: string; platform: string | null } | null {
  if (!text) return null;

  const matches = Array.from(text.matchAll(URL_PATTERN)).map((match) => match[1]);
  if (matches.length === 0) return null;

  for (const url of matches) {
    const platform = recognizeMeetingPlatform(url);
    if (platform) return { url, platform };
  }

  return { url: matches[0], platform: null };
}
