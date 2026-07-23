import type { Metadata } from "next";

import { RecruitersListPanel } from "@/components/recruiters/recruiters-list-panel";
import { buildRecruiterIntelligenceSummary } from "@/features/recruiters/orchestrator";
import { listRecruitersForUser, listReferralsForUser } from "@/features/recruiters/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Recruiters" };

export default async function RecruitersPage() {
  const user = await verifySession();
  const [recruiters, referrals] = await Promise.all([
    listRecruitersForUser(user.id),
    listReferralsForUser(user.id),
  ]);

  // Sprint 21 — the same pure derivation Career Brain uses
  // (`buildRecruiterIntelligenceSummary`), computed here directly since
  // this page doesn't otherwise need the rest of the Career Brain batch.
  const { recruiters: enrichedRecruiters } = buildRecruiterIntelligenceSummary(recruiters, referrals);

  return <RecruitersListPanel recruiters={enrichedRecruiters} />;
}
