import { z } from "zod";

export const CompanyResearchInputSchema = z.object({
  companyName: z.string().min(1, "companyName is required"),
  /** Real job description text CareerOS has actually seen for this
   * company, across every opportunity saved for it — never fetched from
   * anywhere else. Capped at the call site so the prompt stays bounded. */
  jobDescriptions: z.array(z.string().min(1)).min(1).max(5),
});

export const CompanyResearchOutputSchema = z.object({
  summary: z.string(),
  /** Concrete facts the listings actually state — never a general-
   * knowledge claim about the company. */
  highlights: z.array(z.string()),
  /** Standard facts (industry, size, funding) the listings do NOT state —
   * kept explicit so the UI can show what's unknown. */
  caveats: z.array(z.string()),
  /** `null` unless the listings themselves state or strongly imply it —
   * never inferred from the company name alone. */
  industry: z.string().nullable(),
  businessCategory: z.string().nullable(),
  /** Always phrased as an estimate when present (e.g. "51-200 employees
   * (estimated)") — `null` when the listings give no size signal at all. */
  sizeEstimate: z.string().nullable(),
});
