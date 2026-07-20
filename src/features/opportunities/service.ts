import "server-only";

import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/errors";
import { resolveOrCreateCompany } from "@/features/companies/service";
import { getLatestParsedResume } from "@/features/resume/queries";
import { ResumeDataSchema } from "@/features/resume/schema";
import type { Opportunity } from "@/generated/prisma/client";

import { computeMatch, type ResumeMatchProfile } from "./match";
import { getConfiguredProviders } from "./providers/registry";
import type {
  NormalizedOpportunity,
  OpportunityProviderId,
} from "./providers/types";
import { getOwnedOpportunityOrThrow } from "./queries";
import { PROVIDER_TO_DB_SOURCE } from "./types";
import type {
  OpportunitySearchInput,
  SaveOpportunityInput,
  StatusHistory,
  UpdateChecklistInput,
  UpdateCustomQuestionsInput,
  UpdateNotesInput,
  UpdateStatusInput,
} from "./types";

export interface OpportunitySearchResult extends NormalizedOpportunity {
  matchScore: number | null;
  matchReasons: string[];
}

export interface ProviderFailure {
  provider: OpportunityProviderId;
  message: string;
}

export interface SearchOpportunitiesResult {
  results: OpportunitySearchResult[];
  configuredProviderCount: number;
  providerFailures: ProviderFailure[];
}

/** Builds the profile `computeMatch` scores against, from the user's own
 * latest parsed resume — null (not a fabricated empty profile) if they
 * don't have one yet, which `computeMatch` treats as "can't score". */
export async function getResumeMatchProfile(
  userId: string,
): Promise<ResumeMatchProfile | null> {
  const resume = await getLatestParsedResume(userId);
  if (!resume?.parsedData) return null;

  const parsed = ResumeDataSchema.safeParse(resume.parsedData);
  if (!parsed.success) return null;

  return {
    skills: parsed.data.skills,
    currentTitle: parsed.data.experience[0]?.title ?? null,
    location: parsed.data.contact.location,
  };
}

/**
 * Fans out to every configured provider in parallel and merges the
 * results — one provider timing out or erroring never fails the whole
 * search (`Promise.allSettled`), it just means that provider's results
 * are missing this time, surfaced in `providerFailures` so the UI can say
 * so rather than silently showing fewer results than expected.
 */
export async function searchOpportunities(
  params: OpportunitySearchInput,
  resumeProfile: ResumeMatchProfile | null,
): Promise<SearchOpportunitiesResult> {
  const providers = getConfiguredProviders();

  if (providers.length === 0) {
    return { results: [], configuredProviderCount: 0, providerFailures: [] };
  }

  const settled = await Promise.allSettled(
    providers.map((provider) => provider.search(params)),
  );

  const results: OpportunitySearchResult[] = [];
  const providerFailures: ProviderFailure[] = [];

  settled.forEach((outcome, index) => {
    const provider = providers[index];

    if (outcome.status === "fulfilled") {
      for (const job of outcome.value) {
        const match = computeMatch(job, resumeProfile);
        results.push({
          ...job,
          matchScore: match.score,
          matchReasons: match.dimensions
            .filter((dim) => dim.available)
            .map((dim) => dim.detail),
        });
      }
    } else {
      providerFailures.push({
        provider: provider.id,
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "Search failed.",
      });
    }
  });

  results.sort((a, b) => {
    if (a.matchScore === null && b.matchScore === null) return 0;
    if (a.matchScore === null) return 1;
    if (b.matchScore === null) return -1;
    return b.matchScore - a.matchScore;
  });

  return {
    results,
    configuredProviderCount: providers.length,
    providerFailures,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function saveOpportunity(
  userId: string,
  input: SaveOpportunityInput,
): Promise<Opportunity> {
  const initialHistory: StatusHistory = [
    { status: "SAVED", changedAt: nowIso() },
  ];

  // Resolves/creates the shared `Company` graph node by normalized name —
  // never blocks the save if it fails (e.g. a transient DB hiccup), since
  // the opportunity's own `companyName` string is still the source of
  // truth for display either way.
  const company = await resolveOrCreateCompany(input.companyName).catch(() => null);

  return prisma.opportunity.upsert({
    where: {
      userId_source_sourceId: {
        userId,
        source: PROVIDER_TO_DB_SOURCE[input.source],
        sourceId: input.sourceId,
      },
    },
    create: {
      userId,
      source: PROVIDER_TO_DB_SOURCE[input.source],
      sourceId: input.sourceId,
      type: input.type,
      title: input.title,
      companyName: input.companyName,
      companyId: company?.id,
      location: input.location,
      remote: input.remote,
      employmentType: input.employmentType,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      description: input.description,
      skills: input.skills,
      applyUrl: input.applyUrl,
      status: "SAVED",
      statusHistory: initialHistory,
    },
    // Re-saving an already-saved listing refreshes its snapshot but never
    // touches status/notes/checklist — those are the user's own work.
    update: {
      title: input.title,
      companyName: input.companyName,
      companyId: company?.id,
      location: input.location,
      remote: input.remote,
      employmentType: input.employmentType,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      description: input.description,
      skills: input.skills,
      applyUrl: input.applyUrl,
    },
  });
}

export async function updateOpportunityStatus(
  userId: string,
  input: UpdateStatusInput,
): Promise<Opportunity> {
  const opportunity = await getOwnedOpportunityOrThrow(
    input.opportunityId,
    userId,
  );

  const history = (opportunity.statusHistory as unknown as StatusHistory) ?? [];
  const updatedHistory: StatusHistory = [
    ...history,
    { status: input.status, changedAt: nowIso() },
  ];

  return prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: { status: input.status, statusHistory: updatedHistory },
  });
}

export async function updateOpportunityChecklist(
  userId: string,
  input: UpdateChecklistInput,
): Promise<Opportunity> {
  await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  return prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: { checklist: input.checklist },
  });
}

export async function updateOpportunityCustomQuestions(
  userId: string,
  input: UpdateCustomQuestionsInput,
): Promise<Opportunity> {
  await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  return prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: { customQuestions: input.customQuestions },
  });
}

export async function updateOpportunityNotes(
  userId: string,
  input: UpdateNotesInput,
): Promise<Opportunity> {
  await getOwnedOpportunityOrThrow(input.opportunityId, userId);

  if (input.resumeId) {
    const resume = await prisma.resume.findUnique({
      where: { id: input.resumeId },
    });
    if (!resume || resume.userId !== userId) {
      throw new ForbiddenError("That resume doesn't belong to you.");
    }
  }

  return prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: {
      coverLetter: input.coverLetter,
      recruiterNotes: input.recruiterNotes,
      resumeId: input.resumeId,
    },
  });
}
