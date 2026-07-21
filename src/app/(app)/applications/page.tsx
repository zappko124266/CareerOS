import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplicationsFilterBar } from "@/components/opportunities/applications-filter-bar";
import { getDiscoveryPreference } from "@/features/discovery/queries";
import { buildOpportunityIntelligence, type OpportunityIntelligenceContext } from "@/features/opportunities/intelligence";
import { buildApplicationsPriorityQueue, type PriorityQueueRow } from "@/features/opportunities/priority-queue";
import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import { OpportunitySkillsSchema } from "@/features/opportunities/schema";
import { getResumeMatchProfile } from "@/features/opportunities/service";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Applications" };

/**
 * A single, unified view of every saved opportunity — reuses the existing
 * `listOpportunitiesForUser` query. Sprint 2 (Opportunity Intelligence):
 * also reuses `getDiscoveryPreference` and `getResumeMatchProfile` (one
 * extra query total, not per-row) to run every saved opportunity through
 * the Opportunity Intelligence Engine and group them into a Priority
 * Queue, instead of the flat dream-company-only split this page shipped
 * with in Sprint 1.5.
 */
export default async function ApplicationsPage() {
  const user = await verifySession();
  const [opportunities, preference, resumeProfile] = await Promise.all([
    listOpportunitiesForUser(user.id),
    getDiscoveryPreference(user.id),
    getResumeMatchProfile(user.id),
  ]);

  const context: OpportunityIntelligenceContext = {
    dreamCompanyNames: new Set(
      ((preference?.preferredCompanies as string[]) ?? []).map((name) => name.toLowerCase()),
    ),
    urgency: (preference?.availability as OpportunityIntelligenceContext["urgency"]) ?? null,
  };

  const rows: PriorityQueueRow[] = opportunities.map((opportunity) => {
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
    return { opportunity, intelligence };
  });

  const tiers = buildApplicationsPriorityQueue(rows);
  const dreamMatchCount = rows.filter((row) => row.intelligence.isDreamCompany).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            {dreamMatchCount > 0
              ? `${dreamMatchCount} of your ${opportunities.length} saved opportunit${opportunities.length === 1 ? "y is" : "ies are"} at a company on your dream list.`
              : "Every opportunity you've saved, grouped by how well it fits."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm" className="w-fit">
            <Link href="/opportunities/analytics">View analytics</Link>
          </Button>
          <Button asChild variant="default" size="sm" className="w-fit">
            <Link href="/opportunities">Find more jobs</Link>
          </Button>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No applications yet"
          description="Save an opportunity from Jobs to start tracking it here."
          action={
            <Button asChild size="sm">
              <Link href="/opportunities">Find a job</Link>
            </Button>
          }
          className="py-16"
        />
      ) : (
        <ApplicationsFilterBar tiers={tiers} />
      )}
    </div>
  );
}
