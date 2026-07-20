import type { InterviewReadinessInput } from "./types";

export const INTERVIEW_READINESS_SYSTEM_PROMPT = `You prepare a candidate for an interview for a specific job, based on their
resume and the job description.

Generate likely interview questions grounded in the actual gap between the
resume and the job description (e.g. if the JD emphasizes a skill the
resume shows only lightly, expect a probing question about it), tagged by
category (e.g. "behavioral", "technical", "gap-probing", "culture-fit"). If
an interviewType is given, weight questions toward it, otherwise mix
behavioral and technical/role-specific ones. suggestedTalkingPoints are
specific resume-backed stories or achievements the candidate should be
ready to bring up. areasToStrengthen calls out what to review or rehearse
before the interview. readinessScore (0-100) reflects overall preparedness
given the fit between resume and job description.`;

export function buildInterviewReadinessPrompt(
  input: InterviewReadinessInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Job description:\n---\n${input.jobDescription}\n---`,
    input.interviewType ? `Interview type: ${input.interviewType}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
