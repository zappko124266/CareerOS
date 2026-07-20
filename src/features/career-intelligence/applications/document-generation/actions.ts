"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { generateApplicationDocument } from "./service";
import type {
  ApplicationDocumentGenerationInput,
  ApplicationDocumentGenerationOutput,
} from "./types";

export async function generateApplicationDocumentAction(
  input: ApplicationDocumentGenerationInput,
): Promise<AnalysisActionResult<ApplicationDocumentGenerationOutput>> {
  return runAnalysisAction("applications.document_generation", () =>
    generateApplicationDocument(input),
  );
}
