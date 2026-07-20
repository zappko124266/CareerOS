import "server-only";

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function getCompanyById(companyId: string) {
  return prisma.company.findUnique({ where: { id: companyId } });
}

export async function getOwnedCompanyOrThrow(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new NotFoundError("That company doesn't exist.");
  }
  return company;
}

export async function findCompanyByNormalizedName(normalizedName: string) {
  return prisma.company.findUnique({ where: { normalizedName } });
}

/** Real job description text CareerOS has actually seen for this company
 * — capped, most-recent-first — the only grounding source AI company
 * research is allowed to use. */
export async function listRecentJobDescriptionsForCompany(
  companyId: string,
  limit: number,
): Promise<string[]> {
  const opportunities = await prisma.opportunity.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { description: true },
  });

  return opportunities.map((opportunity) => opportunity.description);
}
