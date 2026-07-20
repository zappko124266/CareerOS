import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { FOLLOW_UP_SYSTEM_PROMPT, buildFollowUpPrompt } from "./prompt";
import { FollowUpInputSchema, FollowUpOutputSchema } from "./schema";
import type { FollowUpInput, FollowUpOutput } from "./types";

export const recommendFollowUp = createAnalysisService<FollowUpInput, FollowUpOutput>({
  name: "applications.follow_up",
  inputSchema: FollowUpInputSchema,
  outputSchema: FollowUpOutputSchema,
  systemPrompt: FOLLOW_UP_SYSTEM_PROMPT,
  buildPrompt: buildFollowUpPrompt,
});

export type { FollowUpInput, FollowUpOutput };
export type { AIDependencies };
