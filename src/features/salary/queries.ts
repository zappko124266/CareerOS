import "server-only";

import { prisma } from "@/lib/prisma";

export async function getLatestSalaryEstimate(userId: string) {
  return prisma.salaryEstimate.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSalaryEstimates(userId: string) {
  return prisma.salaryEstimate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
