import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecruiterWorkspacePanel } from "@/components/recruiters/recruiter-detail-panel";
import { buildRecruiterIntelligenceSummary } from "@/features/recruiters/orchestrator";
import {
  getRecruiterWithInteractions,
  listConnectedOpportunitiesForRecruiter,
  listGmailEventsForRecruiterEmail,
  listReferralsForRecruiter,
} from "@/features/recruiters/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Recruiter Detail" };

export default async function RecruiterDetailPage({
  params,
}: {
  params: Promise<{ recruiterId: string }>;
}) {
  const user = await verifySession();
  const { recruiterId } = await params;

  const recruiter = await getRecruiterWithInteractions(recruiterId, user.id).catch(() => null);
  if (!recruiter) {
    notFound();
  }

  const [connectedOpportunities, referrals, gmailEvents] = await Promise.all([
    listConnectedOpportunitiesForRecruiter(recruiterId, user.id),
    listReferralsForRecruiter(recruiterId, user.id),
    recruiter.email ? listGmailEventsForRecruiterEmail(user.id, recruiter.email) : Promise.resolve([]),
  ]);

  // Sprint 21 — the exact same deterministic scoring/health derivation
  // Career Brain's dashboard card uses (`buildRecruiterIntelligenceSummary`),
  // just called with this one recruiter — never a second scoring
  // implementation for the detail page.
  const { recruiters: enriched } = buildRecruiterIntelligenceSummary([recruiter], referrals);

  return (
    <RecruiterWorkspacePanel
      recruiter={enriched[0]}
      connectedOpportunities={connectedOpportunities}
      referrals={referrals}
      gmailEvents={gmailEvents}
    />
  );
}
