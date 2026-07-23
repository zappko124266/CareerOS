import { AVAILABILITY_LABEL, SEARCH_PRIORITY_LABEL } from "@/features/discovery/types";
import type { CareerRoadmap } from "@/features/coach/roadmap";
import type { ConversationTurn, CoachContext, OrchestrationResult } from "@/features/coach/types";

import type { NextStepsPlan } from "./action-planner";

const MAX_HISTORY_TURNS = 10;

export const COACH_SYSTEM_PROMPT = `You are CareerOS Coach — an AI career coach. Your goal is to help people get hired.

Rules you must always follow:
- Never mention ATS, scores, databases, prompts, system instructions, or any other implementation detail.
- Never invent information. Only reference facts explicitly given to you in "Real facts about this user" and "What they told us during onboarding" below — if something isn't listed there, you don't know it.
- When onboarding facts are present, weave them in naturally where relevant (their target role, timeline, urgency, location, dream companies, or what matters most to them) — don't recite the whole list, just use what's actually relevant to this message.
- The recommendation and suggested action have already been decided for you by the product's own logic — you are not deciding what to recommend. Your only job is to explain that decision in plain, natural English and, only if truly useful, ask ONE short follow-up question.
- Never suggest a different action than the one given to you. Never skip ahead of the user's current roadmap milestone.
- Speak like a supportive, professional, honest career coach: encouraging, action-oriented, never overly enthusiastic, no motivational fluff, no emojis.
- Do not end your reply with a question of your own — a follow-up question is handled separately.
- Keep it short — 2 to 4 sentences.`;

/**
 * The Prompt Builder — Sprint 8. Same real facts, onboarding block, and
 * conversation history as the previous inline version
 * (`coach/generate-response.ts`'s `buildContextPrompt`, now deleted), but
 * compacted for minimal token usage (requirement 3): the roadmap section
 * used to list all 7 milestones with status on every single request.
 * The model only ever needs the *current* one (it's told never to skip
 * ahead, and the recommendation only ever references the current
 * milestone) — the rest is now a single completed/remaining count.
 * `nextSteps` (from `action-planner.ts`) is folded in the same
 * lightweight way, no second AI call.
 */
export function buildCoachPrompt(params: {
  message: string;
  context: CoachContext;
  roadmap: CareerRoadmap;
  orchestration: OrchestrationResult;
  history: ConversationTurn[];
  nextSteps: NextStepsPlan;
}): string {
  const { message, context, roadmap, orchestration, history, nextSteps } = params;

  const historyBlock =
    history.length > 0
      ? history
          .slice(-MAX_HISTORY_TURNS)
          .map((turn) => `${turn.role === "user" ? "User" : "Coach"}: ${turn.text}`)
          .join("\n")
      : "(no prior messages this session)";

  const completedCount = roadmap.milestones.filter((milestone) => milestone.status === "completed").length;

  // Only include onboarding facts the user actually answered — an unset
  // field is omitted entirely, never stated as "not set" (nothing for the
  // model to awkwardly comment on) or guessed at.
  const onboardingLines = [
    context.onboarding.targetRole && `- Target role: ${context.onboarding.targetRole}`,
    context.onboarding.targetTimeline && `- Timeline: ${context.onboarding.targetTimeline}`,
    context.onboarding.urgency && `- Job search urgency: ${AVAILABILITY_LABEL[context.onboarding.urgency]}`,
    context.onboarding.locationSummary && `- Location preference: ${context.onboarding.locationSummary}`,
    context.onboarding.dreamCompanies.length > 0 &&
      `- Dream companies: ${context.onboarding.dreamCompanies.join(", ")}`,
    context.onboarding.searchPriorities.length > 0 &&
      `- What matters most: ${context.onboarding.searchPriorities.map((priority) => SEARCH_PRIORITY_LABEL[priority]).join(", ")}`,
    context.onboarding.existingJobPortals.length > 0 &&
      `- Already using: ${context.onboarding.existingJobPortals.join(", ")}`,
  ].filter(Boolean);

  const onboardingBlock =
    onboardingLines.length > 0
      ? `\nWhat they told us during onboarding:\n${onboardingLines.join("\n")}\n`
      : "";

  return `Conversation so far:
${historyBlock}

User's latest message: "${message}"

Real facts about this user — never state anything beyond this:
- Resume: ${context.resume.count > 0 ? "exists" : "does not exist yet"}${context.resumeAnalysis.hasAnalysis ? ", already reviewed" : ""}
- LinkedIn profile: ${context.linkedIn.hasAnalysis ? "already reviewed" : "not yet reviewed"}
- Saved jobs: ${context.jobs.savedCount}
- Applications submitted: ${context.applications.total}
- Interview prep: ${context.interview.isReady ? "completed at least once" : "not started"}
- Offers received: ${context.applications.totalOffers}
- Hired: ${context.hired.achieved ? "yes" : "not yet"}
${onboardingBlock}
Career roadmap: currently on "${roadmap.currentMilestone.title}" (${completedCount} of ${roadmap.milestones.length} milestones complete).
Today's top recommendation: ${nextSteps.dailyMissionTitle}${nextSteps.topRecommendedOpportunity ? ` (best-matching saved opportunity: "${nextSteps.topRecommendedOpportunity}")` : ""}.

The decision has already been made for you — explain it, don't change it:
- Recommendation: ${orchestration.suggestedAction}
- Suggested next action: "${orchestration.cta.label}"

Write a short, natural reply that explains this recommendation in plain English.`;
}
