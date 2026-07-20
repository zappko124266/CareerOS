import type { z } from "zod";

import type {
  CompanySnapshotInputSchema,
  CompanySnapshotOutputSchema,
} from "./schema";

export type CompanySnapshotInput = z.infer<typeof CompanySnapshotInputSchema>;
export type CompanySnapshotOutput = z.infer<typeof CompanySnapshotOutputSchema>;
