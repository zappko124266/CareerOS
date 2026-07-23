import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";

import type { SkillIntelligence } from "./types";

const RECOMMENDED_SKILL_LIMIT = 3;

/**
 * Skill Intelligence builder — counts how often each skill shows up as
 * "missing" across the user's own saved-opportunity Priority Queue rows
 * (Sprint 2's Opportunity Intelligence Engine, already computed once by
 * `getCareerBrain` for Recommended Opportunities — no second match
 * computation here). The skill missing most often across a user's own
 * saved jobs is a real, user-specific signal for what to learn next, not
 * a market-wide guess. `trendingSkills` is left empty — a genuine future
 * extension needing an external market-data source this codebase
 * doesn't have, not fabricated data.
 */
export function buildSkillIntelligence(input: {
  currentSkills: string[];
  priorityQueueRows: PriorityQueueRow[];
}): SkillIntelligence {
  const frequency = new Map<string, number>();
  for (const row of input.priorityQueueRows) {
    for (const skill of row.intelligence.match.missingSkills) {
      frequency.set(skill, (frequency.get(skill) ?? 0) + 1);
    }
  }

  const missingSkills = Array.from(frequency.entries())
    .map(([skill, count]) => ({ skill, frequency: count }))
    .sort((a, b) => b.frequency - a.frequency);

  return {
    currentSkills: input.currentSkills,
    missingSkills,
    recommendedNextSkills: missingSkills.slice(0, RECOMMENDED_SKILL_LIMIT).map((entry) => entry.skill),
    trendingSkills: [],
  };
}
