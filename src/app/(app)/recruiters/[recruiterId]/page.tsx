import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RecruiterDetailPanel } from "@/components/recruiters/recruiter-detail-panel";
import { getRecruiterWithInteractions } from "@/features/recruiters/queries";
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

  return <RecruiterDetailPanel recruiter={recruiter} />;
}
