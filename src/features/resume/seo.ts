import type { ResumeData } from "./schema";

/** Phrases that signal a duty statement rather than an outcome-focused,
 * strong-verb-led bullet — a plain-text heuristic, not an AI judgment
 * call, same "code-computed, not model-guessed" discipline as
 * `Opportunity Score`'s deterministic factors. */
const WEAK_OPENERS = [
  "responsible for",
  "worked on",
  "helped with",
  "assisted in",
  "assisted with",
  "duties included",
  "in charge of",
  "tasked with",
  "involved in",
  "participated in",
];

function collectBullets(resumeData: ResumeData): string[] {
  return [
    ...resumeData.experience.flatMap((entry) => entry.bullets),
    ...resumeData.projects.flatMap((entry) => entry.bullets),
  ].filter((bullet) => bullet.trim().length > 0);
}

export interface ActionVerbUsage {
  score: number;
  totalBullets: number;
  weakBullets: string[];
}

/** Sprint 10, Module 2 — "weak action verb" detection. Deliberately
 * plain code, not a 6th AI-scored factor: whether a bullet opens with a
 * duty-statement phrase is mechanically checkable, so asking a model to
 * judge it would just add latency/cost for something exact-matchable. */
export function computeActionVerbUsage(resumeData: ResumeData): ActionVerbUsage {
  const bullets = collectBullets(resumeData);
  if (bullets.length === 0) {
    return { score: 0, totalBullets: 0, weakBullets: [] };
  }

  const weakBullets = bullets.filter((bullet) => {
    const normalized = bullet.trim().toLowerCase();
    return WEAK_OPENERS.some((opener) => normalized.startsWith(opener));
  });

  const score = Math.round(((bullets.length - weakBullets.length) / bullets.length) * 100);
  return { score, totalBullets: bullets.length, weakBullets };
}

export interface ReadabilityResult {
  score: number;
  averageWordsPerBullet: number;
}

const IDEAL_MIN_WORDS = 10;
const IDEAL_MAX_WORDS = 22;

/** Sprint 10, Module 2 — a readability heuristic over bullet length, not
 * an AI prose-quality judgment. Resume bullets read best in a punchy
 * 10-22 word range; much shorter reads as vague, much longer reads as
 * dense/unscannable (a recruiter skims each bullet in seconds). Score
 * decays linearly with distance outside that range — never a claim to
 * measure actual comprehension. */
export function computeReadability(resumeData: ResumeData): ReadabilityResult {
  const bullets = collectBullets(resumeData);
  if (bullets.length === 0) {
    return { score: 0, averageWordsPerBullet: 0 };
  }

  const wordCounts = bullets.map((bullet) => bullet.trim().split(/\s+/).filter(Boolean).length);
  const averageWordsPerBullet =
    Math.round((wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length) * 10) / 10;

  let score: number;
  if (averageWordsPerBullet >= IDEAL_MIN_WORDS && averageWordsPerBullet <= IDEAL_MAX_WORDS) {
    score = 100;
  } else {
    const distance =
      averageWordsPerBullet < IDEAL_MIN_WORDS
        ? IDEAL_MIN_WORDS - averageWordsPerBullet
        : averageWordsPerBullet - IDEAL_MAX_WORDS;
    score = Math.max(0, Math.round(100 - distance * 8));
  }

  return { score, averageWordsPerBullet };
}
