import "server-only";

import { getCareerAgentSnapshot } from "@/features/career-agent/agent";

import type { AiContext } from "./context";

/**
 * The Action Planner — Sprint 8. Recommends next steps by composing
 * already-computed output from the Career Agent (Sprint 3/4's
 * `getCareerAgentSnapshot`, itself a pure/synchronous derivation over
 * the Career Brain — no query of its own) and the Roadmap Engine. No new
 * recommendation logic: the Daily Mission Engine and Priority Queue
 * already decided what matters most; this only picks the handful of
 * fields a chat response can reference.
 */
export interface NextStepsPlan {
  currentMilestone: string;
  dailyMissionTitle: string;
  topRecommendedOpportunity: string | null;
}

export function planNextSteps(context: AiContext): NextStepsPlan {
  const snapshot = getCareerAgentSnapshot(context.brain, context.coach);

  return {
    currentMilestone: context.roadmap.currentMilestone.title,
    dailyMissionTitle: snapshot.dailyMission.title,
    topRecommendedOpportunity: snapshot.recommendedOpportunities[0]?.opportunity.title ?? null,
  };
}
