import "server-only";

import {
  analyzeLinkedInSeo,
  analyzeRecruiterVisibility,
  improveLinkedInExperience,
  optimizeLinkedInAbout,
  optimizeLinkedInHeadline,
} from "@/features/career-intelligence/linkedin";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

import { getOwnedLinkedInProfileOrThrow, getOwnedLinkedInProfileVersionOrThrow } from "./queries";
import { LINKEDIN_SECTION_KEYWORDS } from "./types";
import type { LinkedInProfileInput } from "./types";

export async function upsertLinkedInProfile(userId: string, input: LinkedInProfileInput) {
  const data = {
    profileText: input.profileText,
    headline: input.headline,
    targetRole: input.targetRole,
  };

  return prisma.linkedInProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

/** Sprint 10, Module 9 — explicit "Save version" snapshot, same
 * insert-only convention as `createResumeVersion`. */
export async function createLinkedInProfileVersion(userId: string, label: string) {
  const profile = await prisma.linkedInProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("Save a LinkedIn profile before creating a version.");
  }

  return prisma.linkedInProfileVersion.create({
    data: {
      profileId: profile.id,
      label,
      data: {
        profileText: profile.profileText,
        headline: profile.headline,
        targetRole: profile.targetRole,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function restoreLinkedInProfileVersion(userId: string, versionId: string) {
  const version = await getOwnedLinkedInProfileVersionOrThrow(versionId, userId);
  const snapshot = version.data as unknown as {
    profileText: string;
    headline: string | null;
    targetRole: string | null;
  };

  return prisma.linkedInProfile.update({
    where: { id: version.profileId },
    data: {
      profileText: snapshot.profileText,
      headline: snapshot.headline,
      targetRole: snapshot.targetRole,
    },
  });
}

/** Sprint 10, Module 1 — "Missing Sections." Deliberately plain-code, not
 * AI: checks whether each common LinkedIn section header keyword appears
 * anywhere in the pasted text. This is a heuristic over the text a user
 * gave us, not a claim to know LinkedIn's actual profile structure or to
 * have inspected the real profile — documented honestly rather than
 * presented as verified fact. */
export function detectMissingLinkedInSections(profileText: string): string[] {
  const normalized = profileText.toLowerCase();
  return LINKEDIN_SECTION_KEYWORDS.filter(
    (section) => !normalized.includes(section.toLowerCase()),
  );
}

type LinkedInAnalysisSlice = "seo" | "recruiterVisibility" | "about" | "headline" | "experience";

/** At most this many AI Router calls in flight at once for one analysis
 * run — 5 independent slices firing unbounded in parallel is what caused
 * this sprint's own live verification to hit a real provider timeout and
 * a worker rate limit in the same run. */
const MAX_CONCURRENT_SLICES = 2;

async function runSlicesWithBoundedConcurrency<T extends string>(
  tasks: { name: T; run: () => Promise<unknown> }[],
): Promise<Map<T, { status: "fulfilled"; value: unknown } | { status: "rejected"; reason: unknown }>> {
  const results = new Map<T, { status: "fulfilled"; value: unknown } | { status: "rejected"; reason: unknown }>();
  for (let i = 0; i < tasks.length; i += MAX_CONCURRENT_SLICES) {
    const batch = tasks.slice(i, i + MAX_CONCURRENT_SLICES);
    const settled = await Promise.allSettled(batch.map((task) => task.run()));
    settled.forEach((result, index) => {
      results.set(
        batch[index].name,
        result.status === "fulfilled"
          ? { status: "fulfilled", value: result.value }
          : { status: "rejected", reason: result.reason },
      );
    });
  }
  return results;
}

/** Sprint 10, Module 1 — runs every LinkedIn SEO Intelligence factor and
 * persists one `LinkedInAnalysis` row. Reuses 4 previously-built AI
 * services (3 of which had zero call sites before this sprint) plus one
 * new one (`improveLinkedInExperience`).
 *
 * Optimized to avoid redundant/wasteful AI Router usage:
 * - **Skips AI entirely** when a full, all-succeeded analysis already
 *   exists for this exact profile text (`profile.updatedAt` no newer than
 *   the latest analysis's `createdAt`) — returns the cached row.
 * - **Only re-runs previously-failed slices** on a retry against
 *   unchanged text (`LinkedInAnalysis.failedSlices` says exactly which),
 *   reusing every already-succeeded slice's real output rather than
 *   regenerating (and re-billing) all 5 again.
 * - **At most 2 AI calls in flight at once** (`runSlicesWithBoundedConcurrency`)
 *   — unbounded parallelism across 5 calls is what caused a real provider
 *   timeout and rate-limit failure during this sprint's own live
 *   verification.
 * - Slices that still fail persist as `null`/`[]` (never a fabricated
 *   result) with their names recorded in `failedSlices`, so the next
 *   retry knows precisely what to redo.
 *
 * Returns `madeAiCalls` alongside the row so the caller (the metered
 * Server Action) only consumes the user's `LINKEDIN_ANALYSIS` entitlement
 * when an AI call actually happened — a cache hit shouldn't cost a
 * credit. */
export async function analyzeLinkedInProfile(userId: string, profileId: string) {
  const profile = await getOwnedLinkedInProfileOrThrow(profileId, userId);

  const latest = await prisma.linkedInAnalysis.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  const isStale = !latest || latest.createdAt < profile.updatedAt;
  const previouslyFailed = new Set<LinkedInAnalysisSlice>(
    !isStale ? ((latest?.failedSlices as unknown as LinkedInAnalysisSlice[]) ?? []) : [],
  );

  const needsSlice = (slice: LinkedInAnalysisSlice) => isStale || previouslyFailed.has(slice);

  if (latest && !isStale && previouslyFailed.size === 0) {
    // Nothing changed since the last fully-successful run — reuse it
    // rather than spending AI Router calls to regenerate the same result.
    return { row: latest, madeAiCalls: false };
  }

  const careerGoal = profile.targetRole
    ? null
    : await prisma.careerGoal.findUnique({ where: { userId } });
  const targetRole = profile.targetRole ?? careerGoal?.targetRole ?? undefined;

  const tasks: { name: LinkedInAnalysisSlice; run: () => Promise<unknown> }[] = [];
  if (needsSlice("seo")) {
    tasks.push({ name: "seo", run: () => analyzeLinkedInSeo({ profileText: profile.profileText }) });
  }
  if (needsSlice("recruiterVisibility")) {
    tasks.push({
      name: "recruiterVisibility",
      run: () => analyzeRecruiterVisibility({ profileText: profile.profileText, targetRole }),
    });
  }
  if (needsSlice("about")) {
    tasks.push({
      name: "about",
      run: () => optimizeLinkedInAbout({ resumeText: profile.profileText, targetRole }),
    });
  }
  if (targetRole && needsSlice("headline")) {
    tasks.push({
      name: "headline",
      run: () => optimizeLinkedInHeadline({ currentHeadline: profile.headline ?? undefined, targetRole }),
    });
  }
  if (needsSlice("experience")) {
    tasks.push({
      name: "experience",
      run: () => improveLinkedInExperience({ profileText: profile.profileText, targetRole }),
    });
  }

  if (tasks.length === 0 && latest) {
    // Nothing actually needed re-running (e.g. the only previously-failed
    // slice requires a target role that still isn't set) — the existing
    // row is still the best available answer.
    return { row: latest, madeAiCalls: false };
  }

  const settled = await runSlicesWithBoundedConcurrency(tasks);

  const failedSlices: LinkedInAnalysisSlice[] = [];
  for (const [name, result] of settled.entries()) {
    if (result.status === "rejected") {
      failedSlices.push(name);
      logger.error("linkedin_profile.analysis_slice_failed", {
        slice: name,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  if (tasks.length > 0 && failedSlices.length === tasks.length && !latest) {
    throw new AppError(
      "linkedin_analysis_failed",
      "The AI Router couldn't complete any part of this analysis — please try again.",
    );
  }

  const seo = settled.get("seo");
  const recruiterVisibility = settled.get("recruiterVisibility");
  const about = settled.get("about");
  const headline = settled.get("headline");
  const experience = settled.get("experience");

  type SeoResult = Awaited<ReturnType<typeof analyzeLinkedInSeo>>;
  type RecruiterVisibilityResult = Awaited<ReturnType<typeof analyzeRecruiterVisibility>>;
  type AboutResult = Awaited<ReturnType<typeof optimizeLinkedInAbout>>;
  type HeadlineResult = Awaited<ReturnType<typeof optimizeLinkedInHeadline>>;
  type ExperienceResult = Awaited<ReturnType<typeof improveLinkedInExperience>>;

  // Freshly-succeeded slice > previously-succeeded slice (still valid,
  // text unchanged) > nothing.
  const seoValue = (
    seo?.status === "fulfilled" ? (seo.value as SeoResult) : null
  ) ?? (latest?.seoScore != null ? { seoScore: latest.seoScore, keywordCoverage: latest.keywordCoverage, suggestions: [] } as unknown as SeoResult : null);
  const recruiterVisibilityValue = (
    recruiterVisibility?.status === "fulfilled" ? (recruiterVisibility.value as RecruiterVisibilityResult) : null
  ) ?? (latest?.recruiterVisibilityScore != null
    ? { visibilityScore: latest.recruiterVisibilityScore, searchAppearanceFactors: [], suggestions: [] } as unknown as RecruiterVisibilityResult
    : null);
  const aboutValue = (about?.status === "fulfilled" ? (about.value as AboutResult) : null) ??
    (latest?.aboutSuggestions ? (latest.aboutSuggestions as unknown as AboutResult) : null);
  const headlineValue = (headline?.status === "fulfilled" ? (headline.value as HeadlineResult) : null) ??
    (latest && (latest.headlineSuggestions as unknown as string[])?.length
      ? { optimizedHeadlines: latest.headlineSuggestions as unknown as string[], rationale: "" } as unknown as HeadlineResult
      : null);
  const experienceValue = (
    experience?.status === "fulfilled" ? (experience.value as ExperienceResult) : null
  ) ?? (latest && !previouslyFailed.has("experience")
    ? { improvements: latest.experienceImprovements } as unknown as ExperienceResult
    : null);

  const missingSections = detectMissingLinkedInSections(profile.profileText);
  const missingKeywords = seoValue
    ? seoValue.keywordCoverage.filter((entry) => !entry.present).map((entry) => entry.keyword)
    : [];

  const row = await prisma.linkedInAnalysis.create({
    data: {
      profileId: profile.id,
      seoScore: seoValue ? Math.round(seoValue.seoScore) : null,
      recruiterVisibilityScore: recruiterVisibilityValue
        ? Math.round(recruiterVisibilityValue.visibilityScore)
        : null,
      keywordCoverage: (seoValue?.keywordCoverage ?? []) as unknown as Prisma.InputJsonValue,
      missingKeywords: missingKeywords as unknown as Prisma.InputJsonValue,
      missingSections: missingSections as unknown as Prisma.InputJsonValue,
      headlineSuggestions: (headlineValue?.optimizedHeadlines ?? []) as unknown as Prisma.InputJsonValue,
      aboutSuggestions: (aboutValue ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
      experienceImprovements: (experienceValue?.improvements ?? []) as unknown as Prisma.InputJsonValue,
      failedSlices: failedSlices as unknown as Prisma.InputJsonValue,
      aiModel: "ai-router",
    },
  });

  return { row, madeAiCalls: tasks.length > 0 };
}
