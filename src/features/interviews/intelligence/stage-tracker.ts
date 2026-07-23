import { INTERVIEW_STAGE_LABEL, INTERVIEW_STAGE_OFF_PATH, INTERVIEW_STAGE_ORDER } from "@/features/interviews/types";
import type { InterviewStage } from "@/features/interviews/types";

/**
 * The Interview Stage Tracker — Sprint 20, Module 2. A pure derivation
 * over the same `stage`/`stageHistory` columns `transitionInterviewStage`
 * (`features/interviews/service.ts`) already writes and
 * `deriveInterviewLifecycleLabel` (`tracking.ts`) already reads — no new
 * column, no second stage machine. `currentStage`/`completedStages`/
 * `nextStage` come straight from `INTERVIEW_STAGE_ORDER` (existing);
 * `daysWaiting` and `lastCommunication` come straight from the real,
 * already-append-only `stageHistory` entries; `confidence` is the latest
 * `InterviewPrep.confidenceScore` when one exists, `null` otherwise — the
 * same "AI readiness score," never a second confidence computation.
 */
export interface InterviewStageProgress {
  currentStage: InterviewStage;
  completedStages: InterviewStage[];
  nextStage: InterviewStage | null;
  /** Days since the last real `stageHistory` transition (or since
   * `createdAt` if the interview has never moved past its initial
   * entry) — never a fabricated "last contact" date. */
  daysWaiting: number;
  lastCommunication: Date | null;
  confidence: number | null;
}

interface StageHistoryEntry {
  stage: string;
  changedAt: string;
}

function parseStageHistory(raw: unknown): StageHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is StageHistoryEntry =>
      typeof entry === "object" && entry !== null && typeof (entry as StageHistoryEntry).stage === "string",
  );
}

export function buildInterviewStageProgress(
  interview: { stage: InterviewStage; stageHistory: unknown; createdAt: Date },
  confidenceScore: number | null,
  now: Date = new Date(),
): InterviewStageProgress {
  const history = parseStageHistory(interview.stageHistory);
  const isOffPath = INTERVIEW_STAGE_OFF_PATH.includes(interview.stage);

  const orderIndex = INTERVIEW_STAGE_ORDER.indexOf(interview.stage);
  const completedStages = isOffPath
    ? INTERVIEW_STAGE_ORDER.slice(0, INTERVIEW_STAGE_ORDER.indexOf("APPLIED") + 1)
    : orderIndex >= 0
      ? INTERVIEW_STAGE_ORDER.slice(0, orderIndex)
      : [];
  const nextStage = !isOffPath && orderIndex >= 0 && orderIndex < INTERVIEW_STAGE_ORDER.length - 1
    ? INTERVIEW_STAGE_ORDER[orderIndex + 1]
    : null;

  const lastTransition = history.length > 0 ? new Date(history[history.length - 1].changedAt) : interview.createdAt;
  const daysWaiting = Math.max(0, Math.floor((now.getTime() - lastTransition.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    currentStage: interview.stage,
    completedStages,
    nextStage,
    daysWaiting,
    lastCommunication: history.length > 0 ? lastTransition : null,
    confidence: confidenceScore,
  };
}

export function stageProgressLabel(stage: InterviewStage): string {
  return INTERVIEW_STAGE_LABEL[stage];
}
