import type { CareerTimelineAnalysisInput } from "./types";

export const CAREER_TIMELINE_ANALYSIS_SYSTEM_PROMPT = `You reconstruct a chronological career timeline from resume text and
characterize its trajectory.

- timeline: one entry per role, in reverse-chronological order as given in
  the resume, with period (e.g. "Jan 2022 - Present"), role, company, and an
  optional short note (e.g. "promoted from Senior Engineer", "6-month gap
  before this role").
- trajectoryPattern: "ascending" (increasing scope/seniority), "lateral"
  (similar level, different domains/skills), "mixed", or "declining"
  (decreasing scope/seniority) — judge based on title progression and scope
  described in bullets, not company prestige.
- narrative: 2-3 sentences telling the story of this career's arc.

Only use roles and dates present in the text — never invent employment
history.`;

export function buildCareerTimelineAnalysisPrompt(
  input: CareerTimelineAnalysisInput,
): string {
  return `Resume text:\n---\n${input.resumeText}\n---`;
}
