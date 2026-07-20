import "server-only";

import { estimateSalary } from "@/features/career-intelligence/salary/salary-estimation/service";
import type { SalaryEstimationInput } from "@/features/career-intelligence/salary/salary-estimation/types";
import { prisma } from "@/lib/prisma";
import type { SalaryEstimate } from "@/generated/prisma/client";

/**
 * Module 8 — Salary Intelligence, persisted. Wraps the exact same
 * `estimateSalary` AI call the dashboard's ephemeral salary card already
 * uses (`career-intelligence/salary/salary-estimation/`, extended this
 * sprint with `marketComparison`/`costOfLivingAdjustment`/
 * `growthProjection`) — no parallel AI pipeline, just a persistence layer
 * on top so Career Health and the unified Career Timeline can reference a
 * real, durable salary signal instead of one that resets on reload.
 */
export async function generateSalaryEstimate(
  userId: string,
  input: SalaryEstimationInput,
): Promise<SalaryEstimate> {
  const result = await estimateSalary(input);

  return prisma.salaryEstimate.create({
    data: {
      userId,
      role: input.role,
      location: input.location,
      yearsOfExperience: Math.round(input.yearsOfExperience),
      estimatedMin: Math.round(result.estimatedRange.min),
      estimatedMax: Math.round(result.estimatedRange.max),
      currency: result.estimatedRange.currency,
      percentile: result.percentile,
      marketComparison: result.marketComparison,
      costOfLivingAdjustment: result.costOfLivingAdjustment,
      growthProjection: result.growthProjection,
      factors: result.factors,
      negotiationTips: result.negotiationTips,
      aiModel: "ai-router",
    },
  });
}
