import "server-only";

import { selectBestResume } from "@/features/applications/service";
import { tailorResume } from "@/features/career-intelligence/resume/tailoring/service";
import type { ResumeData } from "@/features/resume/schema";
import { prisma } from "@/lib/prisma";
import type { Opportunity, Prisma } from "@/generated/prisma/client";

export interface ResumeSelectionResult {
  resumeVersionId: string;
  /** `true` when an existing `ResumeVersion` already targeted this
   * opportunity and was reused as-is — Step "Resume Intelligence: never
   * regenerate if suitable version already exists." */
  reused: boolean;
}

function flattenBullets(data: ResumeData): { id: string; text: string }[] {
  return data.experience.flatMap((experience, experienceIndex) =>
    experience.bullets.map((text, bulletIndex) => ({ id: `${experienceIndex}:${bulletIndex}`, text })),
  );
}

/** Applies real AI-suggested rewrites onto a real, cloned copy of the
 * resume's own parsed data — any suggestion whose `bulletId` doesn't
 * match a real bullet this resume actually has is silently ignored
 * (defensive, same discipline `tailorResume`'s own service already
 * applies to the AI Router's raw output), never invented. */
function applyBulletSuggestions(
  data: ResumeData,
  suggestions: { bulletId: string; tailoredText: string }[],
): ResumeData {
  const suggestionByBulletId = new Map(suggestions.map((suggestion) => [suggestion.bulletId, suggestion.tailoredText]));

  return {
    ...data,
    experience: data.experience.map((experience, experienceIndex) => ({
      ...experience,
      bullets: experience.bullets.map((bullet, bulletIndex) => {
        const suggested = suggestionByBulletId.get(`${experienceIndex}:${bulletIndex}`);
        return suggested ?? bullet;
      }),
    })),
  };
}

/**
 * Resume Selection + Resume Tailoring — reuses Sprint 11 end to end,
 * never a second resume-matching or tailoring implementation:
 * `selectBestResume` (`features/applications/service.ts`, already used
 * by Smart Application Strategy) picks the best-matching *base* résumé;
 * a `ResumeVersion` already `targetOpportunityId`-linked to this
 * opportunity is reused directly (no AI call at all) when one exists;
 * only when none exists does this call the real `tailorResume` Career
 * Intelligence service (the exact one Resume Studio's own "Tailor &
 * Optimize" tab uses) and save its suggestions as a new `ResumeVersion` —
 * the same model, same `targetOpportunityId`/`targetCompanyName`
 * convention Resume Studio's own "tailor for a saved opportunity" flow
 * already established, never a document stored anywhere else.
 */
export async function selectOrTailorResumeVersion(opportunity: Opportunity, userId: string): Promise<ResumeSelectionResult> {
  const bestResume = await selectBestResume(userId, opportunity.description);

  const existingVersion = await prisma.resumeVersion.findFirst({
    where: { resumeId: bestResume.resume.id, targetOpportunityId: opportunity.id },
    orderBy: { createdAt: "desc" },
  });
  if (existingVersion) {
    return { resumeVersionId: existingVersion.id, reused: true };
  }

  const parsedData = bestResume.resume.parsedData as unknown as ResumeData;
  const bullets = flattenBullets(parsedData).slice(0, 30); // ResumeTailoringInputSchema's own real cap

  const tailoring = await tailorResume({
    resumeText: bestResume.resume.rawText!,
    targetJobDescription: opportunity.description,
    bullets,
  });

  const tailoredData = applyBulletSuggestions(parsedData, tailoring.bulletSuggestions);

  const version = await prisma.resumeVersion.create({
    data: {
      resumeId: bestResume.resume.id,
      label: `Tailored for ${opportunity.companyName}`,
      data: tailoredData as unknown as Prisma.InputJsonValue,
      targetOpportunityId: opportunity.id,
      targetCompanyName: opportunity.companyName,
    },
  });

  return { resumeVersionId: version.id, reused: false };
}
