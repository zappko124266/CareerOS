import type { Metadata } from "next";

import { RecruitersListPanel } from "@/components/recruiters/recruiters-list-panel";
import { listRecruitersForUser } from "@/features/recruiters/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Recruiters" };

export default async function RecruitersPage() {
  const user = await verifySession();
  const recruiters = await listRecruitersForUser(user.id);

  return <RecruitersListPanel recruiters={recruiters} />;
}
