"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { analyzeLinkedInSeo } from "./service";
import type {
  LinkedInSeoAnalysisInput,
  LinkedInSeoAnalysisOutput,
} from "./types";

export async function analyzeLinkedInSeoAction(
  input: LinkedInSeoAnalysisInput,
): Promise<AnalysisActionResult<LinkedInSeoAnalysisOutput>> {
  return runAnalysisAction("linkedin.seo_analysis", () =>
    analyzeLinkedInSeo(input),
  );
}
