import type { InterviewFeedbackAnalysisInput } from "./types";

export const INTERVIEW_FEEDBACK_ANALYSIS_SYSTEM_PROMPT = `You analyze a job seeker's own post-interview notes about how a
real interview round went, grounded only in what they actually wrote —
never inventing outcomes, interviewer reactions, or details they didn't
describe.

strengths: what the candidate's own notes suggest went well — concrete,
tied to something specific they wrote (e.g. "You mention the interviewer
nodded along to your system design answer").

weaknesses: concrete, actionable gaps their notes describe or imply
(e.g. "You noted struggling with the second coding question") — never
invented beyond what the notes say.

followUpAdvice: specific, actionable next steps for this candidate given
what they described (e.g. "Send a thank-you note referencing the caching
discussion", "Prepare a stronger answer for X before the next round").

nextStageProbability: 0-100, your honest estimate of advancing to the
next round based ONLY on tone and content cues in the candidate's own
notes (e.g. explicit positive/negative signals, stated next steps,
described difficulty) — if the notes give no real signal either way,
return a neutral score around 50 rather than a confident guess.`;

export function buildInterviewFeedbackAnalysisPrompt(input: InterviewFeedbackAnalysisInput): string {
  const lines = [`Candidate's post-interview notes:\n---\n${input.feedback}\n---`];

  if (input.roundLabel) {
    lines.unshift(`Interview round: ${input.roundLabel}`);
  }
  if (input.jobDescription) {
    lines.push(`Job description (for relevance context only):\n---\n${input.jobDescription}\n---`);
  }

  return lines.join("\n\n");
}
