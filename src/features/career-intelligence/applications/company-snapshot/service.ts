import "server-only";

import { createAnalysisService } from "@/features/career-intelligence/analysis/service-factory";
import type { AIDependencies } from "@/features/career-intelligence/analysis/types";

import { buildCompanySnapshotPrompt, COMPANY_SNAPSHOT_SYSTEM_PROMPT } from "./prompt";
import { CompanySnapshotInputSchema, CompanySnapshotOutputSchema } from "./schema";
import type { CompanySnapshotInput, CompanySnapshotOutput } from "./types";

const runCompanySnapshot = createAnalysisService<
  CompanySnapshotInput,
  CompanySnapshotOutput
>({
  name: "applications.company_snapshot",
  inputSchema: CompanySnapshotInputSchema,
  outputSchema: CompanySnapshotOutputSchema,
  systemPrompt: COMPANY_SNAPSHOT_SYSTEM_PROMPT,
  buildPrompt: buildCompanySnapshotPrompt,
});

export async function summarizeCompany(
  input: CompanySnapshotInput,
  deps: AIDependencies = {},
): Promise<CompanySnapshotOutput> {
  const result = await runCompanySnapshot(input, deps);

  return {
    ...result,
    highlights: result.highlights.map((entry) => entry.trim()).filter(Boolean),
    caveats: result.caveats.map((entry) => entry.trim()).filter(Boolean),
  };
}
