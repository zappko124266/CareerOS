import { z } from "zod";

export const CompanySnapshotInputSchema = z.object({
  companyName: z.string().min(1, "companyName is required"),
  jobTitle: z.string().min(1, "jobTitle is required"),
  jobDescription: z.string().min(1, "jobDescription is required"),
});

export const CompanySnapshotOutputSchema = z.object({
  summary: z.string(),
  /** Concrete facts the listing text actually states (e.g. "Series B
   * startup", "remote-first", "500-person engineering org") — never a
   * general-knowledge claim about the company. */
  highlights: z.array(z.string()),
  /** Standard facts (industry, company size, funding stage, etc.) the
   * listing does NOT state — kept explicit so the UI can show what's
   * unknown instead of letting a confident summary imply completeness. */
  caveats: z.array(z.string()),
});
