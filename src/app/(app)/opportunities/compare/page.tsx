import type { Metadata } from "next";

import { JobComparisonWorkspace } from "@/components/opportunities/job-comparison-workspace";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import {
  buildOpportunityIntelligence,
  type OpportunityIntelligenceContext,
} from "@/features/opportunities/intelligence";
import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import { OpportunitySkillsSchema } from "@/features/opportunities/schema";
import { computeOpportunityScoreV2 } from "@/features/opportunities/score";
import { getResumeMatchProfile } from "@/features/opportunities/service";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Compare Jobs" };

const MAX_COMPARE = 4;

/**
 * Sprint 12 (Job Studio), requirement 9 — side-by-side comparison of the
 * user's saved opportunities. Every number here comes from the exact same
 * calls the single-opportunity workspace and `/applications` already
 * make (`buildOpportunityIntelligence`, `computeOpportunityScoreV2`) —
 * just run once per selected job instead of once per page.
 */
export default async function CompareOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const user = await verifySession();

  const [opportunities, preference, resumeProfile] = await Promise.all([
    listOpportunitiesForUser(user.id),
    getDiscoveryPreference(user.id),
    getResumeMatchProfile(user.id),
  ]);

  const selectedIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  const context: OpportunityIntelligenceContext = {
    dreamCompanyNames: new Set(
      ((preference?.preferredCompanies as string[]) ?? []).map((name) => name.toLowerCase()),
    ),
    urgency: (preference?.availability as OpportunityIntelligenceContext["urgency"]) ?? null,
  };

  const selectedOpportunities = selectedIds
    .map((id) => opportunities.find((opportunity) => opportunity.id === id))
    .filter((opportunity): opportunity is NonNullable<typeof opportunity> => Boolean(opportunity));

  const comparisons = await Promise.all(
    selectedOpportunities.map(async (opportunity) => {
      const skills = OpportunitySkillsSchema.safeParse(opportunity.skills);
      const intelligence = buildOpportunityIntelligence(
        {
          title: opportunity.title,
          location: opportunity.location,
          remote: opportunity.remote,
          skills: skills.success ? skills.data : [],
          companyName: opportunity.companyName,
        },
        resumeProfile,
        context,
      );
      const score = await computeOpportunityScoreV2(opportunity.id, user.id);
      return { opportunity, intelligence, score };
    }),
  );

  return (
    <JobComparisonWorkspace
      allOpportunities={opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
        companyName: opportunity.companyName,
      }))}
      selectedIds={selectedIds}
      comparisons={comparisons}
      maxCompare={MAX_COMPARE}
    />
  );
}
