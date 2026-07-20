import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { buildJobRankingPrompt, JOB_RANKING_SYSTEM_PROMPT } from "./prompt";
import { JobRankingInputSchema, JobRankingOutputSchema } from "./schema";
import type { JobRankingInput, JobRankingOutput } from "./types";

const runJobRanking = createAnalysisService<JobRankingInput, JobRankingOutput>({
  name: "discovery.job_ranking",
  inputSchema: JobRankingInputSchema,
  outputSchema: JobRankingOutputSchema,
  systemPrompt: JOB_RANKING_SYSTEM_PROMPT,
  buildPrompt: buildJobRankingPrompt,
});

/** Drops any ranking whose `sourceId` doesn't match a job actually sent in
 * — same hallucinated-reference guard as `tailorResume`'s bulletSuggestions
 * filter (see `features/career-intelligence/resume/tailoring/service.ts`). */
export async function rankJobs(
  input: JobRankingInput,
  deps: AIDependencies = {},
): Promise<JobRankingOutput> {
  const result = await runJobRanking(input, deps);
  const validIds = new Set(input.jobs.map((job) => job.sourceId));

  return {
    rankings: result.rankings.filter((ranking) => validIds.has(ranking.sourceId)),
  };
}
