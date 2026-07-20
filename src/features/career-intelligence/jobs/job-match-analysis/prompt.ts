import type { JobMatchAnalysisInput } from "./types";

export const JOB_MATCH_ANALYSIS_SYSTEM_PROMPT = `You assess how well a candidate's resume matches a specific job posting.

List the job's requirements the resume clearly matches, and the ones it
doesn't. matchScore (0-100) should weigh must-have requirements more
heavily than nice-to-haves. recommendation: "strong_match" (clearly
qualified, apply with confidence), "good_match" (qualified with some gaps,
worth applying), "stretch" (missing several requirements, possible but
competitive), or "not_a_match" (missing core requirements). summary is 2-3
sentences giving the candidate a clear, honest read on their odds.`;

export function buildJobMatchAnalysisPrompt(
  input: JobMatchAnalysisInput,
): string {
  return [
    `Resume text:\n---\n${input.resumeText}\n---`,
    `Job description:\n---\n${input.jobDescription}\n---`,
  ].join("\n\n");
}
