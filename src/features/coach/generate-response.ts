import { streamText } from "@/lib/ai";
import { AVAILABILITY_LABEL, SEARCH_PRIORITY_LABEL } from "@/features/discovery/types";
import type { CareerRoadmap } from "./roadmap";
import type {
  ConversationTurn,
  CoachContext,
  CoachIntent,
  CoachResponseMeta,
  CoachTone,
  OrchestrationResult,
} from "./types";

const MAX_HISTORY_TURNS = 10;

const SYSTEM_PROMPT = `You are CareerOS Coach — an AI career coach. Your goal is to help people get hired.

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
 * Builds the "User Context / Roadmap / Current Milestone / User Message"
 * prompt (Step 3) — every fact comes straight from the Context Engine and
 * Roadmap Engine, nothing invented, nothing recomputed.
 */
function buildContextPrompt(params: {
  message: string;
  context: CoachContext;
  roadmap: CareerRoadmap;
  orchestration: OrchestrationResult;
  history: ConversationTurn[];
}): string {
  const { message, context, roadmap, orchestration, history } = params;

  const historyBlock =
    history.length > 0
      ? history
          .slice(-MAX_HISTORY_TURNS)
          .map((turn) => `${turn.role === "user" ? "User" : "Coach"}: ${turn.text}`)
          .join("\n")
      : "(no prior messages this session)";

  const milestonesBlock = roadmap.milestones
    .map((milestone) => `- ${milestone.title}: ${milestone.status}`)
    .join("\n");

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
Career roadmap (current milestone: "${roadmap.currentMilestone.title}"):
${milestonesBlock}

The decision has already been made for you — explain it, don't change it:
- Recommendation: ${orchestration.suggestedAction}
- Suggested next action: "${orchestration.cta.label}"

Write a short, natural reply that explains this recommendation in plain English.`;
}

/**
 * The Conversation Generator's streaming half (Step 6). Reuses the
 * existing AI Router's `streamText` — no new client, no new provider.
 * Returns the raw stream result so the caller (a Route Handler) can pipe
 * it to the client token-by-token via `.toTextStreamResponse()`.
 */
export function streamCoachMessage(params: {
  message: string;
  context: CoachContext;
  roadmap: CareerRoadmap;
  orchestration: OrchestrationResult;
  history: ConversationTurn[];
}) {
  return streamText({
    system: SYSTEM_PROMPT,
    prompt: buildContextPrompt(params),
  });
}

/** Deterministic fallback message when even `streamText` itself can't
 * start (Step 1's "never break chat" applies here too, not just to
 * classification) — just the orchestrator's own plain-language decision,
 * with no AI phrasing on top. */
export function fallbackCoachMessage(orchestration: OrchestrationResult): string {
  return orchestration.suggestedAction;
}

/** Step 7 — one optional follow-up question per intent, always checked
 * against `CoachContext` first so it never asks something already known.
 * Deterministic on purpose: the Orchestrator (not the model) decides what
 * still needs asking. */
function pickFollowUpQuestion(intent: CoachIntent, context: CoachContext): string | null {
  switch (intent) {
    case "resume":
      return context.resume.count === 0
        ? "Do you already have a resume ready to upload, or are we starting from scratch?"
        : null;
    case "jobs":
      return "What kind of role are you targeting?";
    case "career_switch":
      return "What field or industry are you hoping to move into?";
    default:
      return null;
  }
}

function pickTone(intent: CoachIntent): CoachTone {
  if (intent === "unknown") return "professional";
  return "encouraging";
}

/**
 * The Conversation Generator's deterministic half (Step 2) — `cta` is a
 * direct pass-through of the Orchestrator's decision (never AI-decided),
 * `followUpQuestion`/`tone` are simple rule lookups, not model output.
 * Keeping these out of the LLM call is what keeps the Orchestrator the
 * source of truth (Step 8).
 */
export function buildCoachResponseMeta(orchestration: OrchestrationResult, context: CoachContext): CoachResponseMeta {
  return {
    cta: orchestration.cta,
    followUpQuestion: pickFollowUpQuestion(orchestration.intent, context),
    tone: pickTone(orchestration.intent),
  };
}
