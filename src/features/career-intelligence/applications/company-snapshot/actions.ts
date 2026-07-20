"use server";

import { runAnalysisAction } from "@/features/career-intelligence/analysis/action-helper";
import type { AnalysisActionResult } from "@/features/career-intelligence/analysis/types";

import { summarizeCompany } from "./service";
import type { CompanySnapshotInput, CompanySnapshotOutput } from "./types";

export async function summarizeCompanyAction(
  input: CompanySnapshotInput,
): Promise<AnalysisActionResult<CompanySnapshotOutput>> {
  return runAnalysisAction("applications.company_snapshot", () =>
    summarizeCompany(input),
  );
}
