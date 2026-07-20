import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompanyIntelligencePanel } from "@/components/opportunities/company-intelligence-panel";
import { getCompanyIntelligence } from "@/features/companies/service";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Company Intelligence" };

export default async function CompanyIntelligencePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await verifySession();
  const { companyId } = await params;

  const intelligence = await getCompanyIntelligence(companyId).catch(() => null);
  if (!intelligence) {
    notFound();
  }

  return <CompanyIntelligencePanel company={intelligence.company} aggregates={intelligence.aggregates} />;
}
