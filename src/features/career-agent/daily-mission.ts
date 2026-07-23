import type { NextStep, NextStepStage } from "../coach/recommend-next-step";

import type { DailyMission } from "./types";

/** A deterministic, honest estimate of the real time each stage of
 * `recommendNextStep`'s priority chain actually takes — not a guess
 * rendered per-user, the same fixed mapping for everyone at a given
 * stage, same discipline as the rest of this codebase's "no fabricated
 * numbers" rule. */
const EFFORT_BY_STAGE: Record<NextStepStage, string> = {
  resume_missing: "10-15 minutes",
  resume_poor: "20-30 minutes",
  linkedin_missing: "15 minutes",
  jobs_missing: "10 minutes",
  applications_missing: "15-20 minutes",
  interview_missing: "30-60 minutes",
  healthy: "5 minutes",
};

/**
 * The Daily Mission Engine — Sprint 3. Returns exactly one
 * highest-impact recommendation. This never re-derives priority itself:
 * `recommendNextStep` (`features/coach/recommend-next-step.ts`) already
 * is the single, deterministic "first matching rule wins" engine used by
 * both the Coach and the Roadmap; this only decorates its output with an
 * effort estimate so the Daily Mission card can show one without
 * duplicating the priority chain.
 */
export function buildDailyMission(nextStep: NextStep): DailyMission {
  return {
    stage: nextStep.stage,
    title: nextStep.title,
    why: nextStep.why,
    href: nextStep.href,
    actionLabel: nextStep.actionLabel,
    effort: EFFORT_BY_STAGE[nextStep.stage],
  };
}
