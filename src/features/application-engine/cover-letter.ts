import "server-only";

import { generateApplicationDocument } from "@/features/career-intelligence/applications/document-generation/service";
import { prisma } from "@/lib/prisma";
import type { Opportunity } from "@/generated/prisma/client";

export interface CoverLetterSelectionResult {
  documentId: string;
  reused: boolean;
}

/**
 * Cover Letter Generation — reuses Application Studio's existing
 * `generateApplicationDocument` (the one AI call behind Cover Letter
 * Studio, Email Studio, and Recruiter Message Studio alike) with no new
 * prompt. Reuses an existing `ApplicationDocument` (any status — a
 * user-edited draft is exactly as usable as a freshly generated one, and
 * is preferred since it reflects the user's own edits) for this
 * opportunity when one already exists, never regenerating needlessly.
 */
export async function selectOrGenerateCoverLetter(
  opportunity: Opportunity,
  resumeText: string,
): Promise<CoverLetterSelectionResult> {
  const existing = await prisma.applicationDocument.findFirst({
    where: { opportunityId: opportunity.id, kind: "COVER_LETTER" },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    return { documentId: existing.id, reused: true };
  }

  const result = await generateApplicationDocument({
    kind: "COVER_LETTER",
    action: "GENERATE",
    audience: "HIRING_MANAGER",
    tone: "PROFESSIONAL",
    length: "MEDIUM",
    resumeText,
    jobDescription: opportunity.description,
    companyName: opportunity.companyName,
    roleTitle: opportunity.title,
  });

  const document = await prisma.applicationDocument.create({
    data: {
      opportunityId: opportunity.id,
      kind: "COVER_LETTER",
      audience: "HIRING_MANAGER",
      tone: "PROFESSIONAL",
      length: "MEDIUM",
      title: `Cover Letter — ${opportunity.companyName}`,
      content: result.content,
      status: "DRAFT",
      aiModel: "ai-router",
    },
  });

  return { documentId: document.id, reused: false };
}
