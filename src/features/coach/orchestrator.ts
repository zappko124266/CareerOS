import { getCareerRoadmap, type RoadmapMilestone } from "./roadmap";
import { COACH_WORKFLOWS } from "./workflows";
import type {
  ClassifierResult,
  CoachContext,
  CoachIntent,
  OrchestrationResult,
} from "./types";

/** Which roadmap milestone each "actionable" intent corresponds to — used
 * to decide whether the user is asking about something ahead of their
 * current milestone. career_switch/salary/general_advice/unknown aren't
 * part of the roadmap and are never gated. */
const INTENT_MILESTONE_ID: Partial<Record<CoachIntent, string>> = {
  resume: "resume",
  linkedin: "linkedin",
  jobs: "jobs",
  applications: "applications",
  interview: "interview",
};

/** Inverse of the above, for milestones that map 1:1 onto an intent
 * ("offer"/"hired" don't — there's no chat intent for those). Used so
 * that whenever the response actually talks about a *different* milestone
 * than the user asked about (a gated redirect, or the general/unknown
 * fallback), `OrchestrationResult.intent` reflects what's actually being
 * discussed — otherwise downstream copy (like the follow-up question)
 * keyed off `intent` would describe the wrong topic. */
const MILESTONE_ID_TO_INTENT: Partial<Record<string, CoachIntent>> = {
  resume: "resume",
  linkedin: "linkedin",
  jobs: "jobs",
  applications: "applications",
  interview: "interview",
};

function resolveEffectiveIntent(milestoneId: string, fallback: CoachIntent): CoachIntent {
  return MILESTONE_ID_TO_INTENT[milestoneId] ?? fallback;
}

/** Coach-toned copy that always names the current roadmap milestone
 * (Step 6) — never a score, never "ATS", never an implementation detail. */
function describeMilestone(milestone: RoadmapMilestone, isRedirect: boolean): string {
  const lead = isRedirect
    ? "I recommend focusing on this first: "
    : "Here's your next milestone: ";
  return `${lead}${milestone.title}. ${milestone.why}`;
}

/**
 * The Coach Orchestrator. Receives a message's classification AND the
 * full Context Engine output, and decides using both — always anchored
 * to the Career Roadmap's current milestone (Step 6).
 *
 * For the 5 core pipeline intents, it checks whether the roadmap's
 * current milestone comes *before* the one the user asked about. If so,
 * it redirects to the current milestone instead of blindly fulfilling
 * the literal request — reusing the Roadmap Engine's own output, never
 * re-deriving readiness itself. Exactly one recommendation is ever
 * returned. It never generates an answer itself — only looks up
 * `workflows.ts`'s existing-feature mapping and composes real,
 * already-computed data into plain-language copy.
 */
export function orchestrate(
  classification: ClassifierResult,
  context: CoachContext,
): OrchestrationResult {
  const roadmap = getCareerRoadmap(context);
  const requestedMilestoneId = INTENT_MILESTONE_ID[classification.intent];

  if (requestedMilestoneId) {
    const requestedIndex = roadmap.milestones.findIndex(
      (milestone) => milestone.id === requestedMilestoneId,
    );
    const currentIndex = roadmap.milestones.findIndex(
      (milestone) => milestone.id === roadmap.currentMilestone.id,
    );

    if (currentIndex !== -1 && currentIndex < requestedIndex) {
      const effectiveIntent = resolveEffectiveIntent(
        roadmap.currentMilestone.id,
        classification.intent,
      );

      return {
        intent: effectiveIntent,
        confidence: classification.confidence,
        reason: classification.reason,
        suggestedAction: describeMilestone(roadmap.currentMilestone, true),
        cta: roadmap.currentMilestone.cta,
        existingRoute: roadmap.currentMilestone.route,
        futureAiHook: COACH_WORKFLOWS[effectiveIntent].futureAiHook,
      };
    }
  }

  const workflow = COACH_WORKFLOWS[classification.intent];

  if (classification.intent === "interview") {
    return {
      intent: classification.intent,
      confidence: classification.confidence,
      reason: classification.reason,
      suggestedAction: workflow.suggestedAction,
      cta: { label: workflow.ctaLabel, href: context.interview.href },
      existingRoute: context.interview.href,
      futureAiHook: workflow.futureAiHook,
    };
  }

  if (classification.intent === "general_advice" || classification.intent === "unknown") {
    const effectiveIntent = resolveEffectiveIntent(
      roadmap.currentMilestone.id,
      classification.intent,
    );

    return {
      intent: effectiveIntent,
      confidence: classification.confidence,
      reason: classification.reason,
      suggestedAction: describeMilestone(roadmap.currentMilestone, false),
      cta: roadmap.currentMilestone.cta,
      existingRoute: roadmap.currentMilestone.route,
      futureAiHook: COACH_WORKFLOWS[effectiveIntent].futureAiHook,
    };
  }

  return {
    intent: classification.intent,
    confidence: classification.confidence,
    reason: classification.reason,
    suggestedAction: workflow.suggestedAction,
    cta: { label: workflow.ctaLabel, href: workflow.route },
    existingRoute: workflow.route,
    futureAiHook: workflow.futureAiHook,
  };
}
