import "server-only";

import { computeActionVerbUsage } from "@/features/resume/seo";
import { ResumeDataSchema } from "@/features/resume/schema";
import { getLatestLinkedInAnalysis } from "@/features/linkedin-profile/queries";
import { STATUS_OFF_PATH } from "@/features/opportunities/types";
import { prisma } from "@/lib/prisma";

export interface ProfileInsight {
  insight: string;
  source: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Same word-boundary "does a saved opportunity's own skills tag appear
 * in this gap requirement sentence" match as Sprint 9's
 * `countCompaniesRequiringSkills` — reused for saved `Opportunity` rows
 * instead of `DiscoveredListing` rows, since this insight is specifically
 * about the user's own saved opportunities, not the wider discovery
 * feed. One query for every requirement checked (same "one query
 * regardless of how many skills" discipline as the Sprint 9 original),
 * not one query per gap. */
async function countSavedOpportunitiesRequiringSkills(
  userId: string,
  requirements: string[],
): Promise<Record<string, number>> {
  if (requirements.length === 0) return {};

  const opportunities = await prisma.opportunity.findMany({
    where: { userId, status: { notIn: STATUS_OFF_PATH } },
    select: { skills: true },
  });

  const counts: Record<string, number> = Object.fromEntries(requirements.map((r) => [r, 0]));

  for (const opportunity of opportunities) {
    const skills = Array.isArray(opportunity.skills)
      ? (opportunity.skills as unknown[]).filter((value): value is string => typeof value === "string")
      : [];
    if (skills.length === 0) continue;

    for (const requirement of requirements) {
      const matches = skills.some(
        (skill) =>
          new RegExp(`\\b${escapeRegExp(requirement)}\\b`, "i").test(skill) ||
          new RegExp(`\\b${escapeRegExp(skill)}\\b`, "i").test(requirement),
      );
      if (matches) counts[requirement] += 1;
    }
  }

  return counts;
}

/**
 * Sprint 10, Module 8 — AI Insights. Deliberately zero AI calls: every
 * example insight the sprint brief gives is mechanically derivable from
 * data Modules 1/2/(Sprint 9's Career Gap Engine) already compute and
 * persist. This is a pure aggregation/templating function reading
 * already-real numbers — the strictest possible reading of "never
 * fabricate," since there's no model in the loop to hallucinate.
 */
export async function generateProfileInsights(userId: string): Promise<ProfileInsight[]> {
  const insights: ProfileInsight[] = [];

  const [latestResume, latestGapAssessment, latestLinkedInAnalysis] = await Promise.all([
    prisma.resume.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.experienceGapAssessment.findFirst({
      where: { opportunity: { userId } },
      orderBy: { createdAt: "desc" },
    }),
    getLatestLinkedInAnalysis(userId),
  ]);

  if (latestResume?.parsedData) {
    const parsed = ResumeDataSchema.safeParse(latestResume.parsedData);
    if (parsed.success) {
      const usage = computeActionVerbUsage(parsed.data);
      if (usage.weakBullets.length > 0) {
        insights.push({
          insight: `Your resume uses a duty phrase instead of a strong action verb in ${usage.weakBullets.length} of ${usage.totalBullets} bullets.`,
          source: "Resume SEO Engine",
        });
      }
    }
  }

  if (latestLinkedInAnalysis) {
    const missingKeywords = latestLinkedInAnalysis.missingKeywords as unknown as string[];
    if (missingKeywords.length > 0) {
      insights.push({
        insight: `Your LinkedIn profile is missing ${missingKeywords.length} keyword${missingKeywords.length === 1 ? "" : "s"} recruiters commonly search for: ${missingKeywords.slice(0, 4).join(", ")}${missingKeywords.length > 4 ? ", …" : ""}.`,
        source: "LinkedIn SEO Intelligence",
      });
    }
  }

  if (latestGapAssessment) {
    const gaps = latestGapAssessment.gaps as unknown as { requirement: string }[];
    const requirements = gaps.slice(0, 3).map((gap) => gap.requirement);
    const counts = await countSavedOpportunitiesRequiringSkills(userId, requirements);

    for (const requirement of requirements) {
      const count = counts[requirement];
      if (count > 0) {
        insights.push({
          insight: `Closing the "${requirement}" gap could increase your eligibility for ${count} saved opportunit${count === 1 ? "y" : "ies"}.`,
          source: "Career Gap Engine",
        });
      }
    }
  }

  return insights;
}
