import "server-only";

import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import { prisma } from "@/lib/prisma";
import type { Opportunity } from "@/generated/prisma/client";

/** Statuses that mean "this was actually submitted" — self-reported, same
 * honesty caveat as everywhere else `OpportunityStatus` is used. Includes
 * every status at or past `APPLIED`. */
const APPLIED_STATUSES = new Set<string>([
  "APPLIED",
  "APPLICATION_VIEWED",
  "RECRUITER_CONTACT",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "DECLINED",
  "REJECTED",
  "WITHDRAWN",
  "JOINED",
]);

/** Any status implying the employer side did *something* — viewed it,
 * reached out, moved it forward, or even rejected it. `WITHDRAWN` is
 * deliberately excluded: that's the user's own action, not a signal the
 * employer responded. */
const RESPONSE_STATUSES = new Set<string>([
  "APPLICATION_VIEWED",
  "RECRUITER_CONTACT",
  "SHORTLISTED",
  "ASSESSMENT",
  "INTERVIEWING",
  "OFFER",
  "ACCEPTED",
  "DECLINED",
  "REJECTED",
  "JOINED",
]);

const INTERVIEW_STATUSES = new Set<string>(["INTERVIEWING", "OFFER", "ACCEPTED", "DECLINED", "JOINED"]);
const OFFER_STATUSES = new Set<string>(["OFFER", "ACCEPTED", "DECLINED", "JOINED"]);

/** Checks the opportunity's *current* status and its full `statusHistory`
 * — an opportunity that reached INTERVIEWING and was later REJECTED still
 * counts as having interviewed; only the current status would miss that. */
function everReached(opportunity: Opportunity, statuses: Set<string>): boolean {
  if (statuses.has(opportunity.status)) return true;
  const history = (opportunity.statusHistory ?? []) as Array<{ status: string }>;
  return history.some((entry) => statuses.has(entry.status));
}

function computeRate(total: number, part: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export interface GroupedRate {
  label: string;
  applications: number;
  responseRate: number;
}

function groupResponseRates(
  applied: Opportunity[],
  keyFn: (opportunity: Opportunity) => string | null,
): GroupedRate[] {
  const groups = new Map<string, Opportunity[]>();
  for (const opportunity of applied) {
    const key = keyFn(opportunity);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(opportunity);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([label, group]) => {
      const responses = group.filter((o) => everReached(o, RESPONSE_STATUSES)).length;
      return {
        label,
        applications: group.length,
        responseRate: computeRate(group.length, responses),
      };
    })
    .sort((a, b) => b.responseRate - a.responseRate || b.applications - a.applications);
}

export interface ApplicationAnalytics {
  totalApplications: number;
  totalInterviews: number;
  totalOffers: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  resumePerformance: GroupedRate[];
  coverLetterResponseRateWith: number | null;
  coverLetterResponseRateWithout: number | null;
  coverLetterApplicationsWith: number;
  coverLetterApplicationsWithout: number;
  bestCompanies: GroupedRate[];
  bestRoles: GroupedRate[];
  bestLocations: GroupedRate[];
}

/**
 * Module 10 — Application Analytics. Every number here is a real
 * aggregate computed from `Opportunity` rows (self-reported status, same
 * honesty caveat as the rest of the Application Tracker) and
 * `ApplicationDocument` rows — nothing estimated or invented. "Industry"
 * breakdowns are deliberately not included: CareerOS doesn't collect an
 * industry classification for opportunities, so a "Best Industries" card
 * would have to fabricate one.
 */
export async function computeApplicationAnalytics(userId: string): Promise<ApplicationAnalytics> {
  const opportunities = await listOpportunitiesForUser(userId);
  const applied = opportunities.filter((o) => everReached(o, APPLIED_STATUSES));

  const totalApplications = applied.length;
  const totalInterviews = applied.filter((o) => everReached(o, INTERVIEW_STATUSES)).length;
  const totalOffers = applied.filter((o) => everReached(o, OFFER_STATUSES)).length;
  const totalResponses = applied.filter((o) => everReached(o, RESPONSE_STATUSES)).length;

  const resumeIds = Array.from(
    new Set(applied.map((o) => o.resumeId).filter((id): id is string => Boolean(id))),
  );
  const resumes = resumeIds.length > 0
    ? await prisma.resume.findMany({ where: { id: { in: resumeIds } }, select: { id: true, title: true } })
    : [];
  const resumeTitleById = new Map(resumes.map((r) => [r.id, r.title]));

  const resumePerformance = groupResponseRates(applied, (o) =>
    o.resumeId ? (resumeTitleById.get(o.resumeId) ?? null) : null,
  );

  const opportunityIds = applied.map((o) => o.id);
  const coverLetterDocs = opportunityIds.length > 0
    ? await prisma.applicationDocument.findMany({
        where: { opportunityId: { in: opportunityIds }, kind: "COVER_LETTER", status: "DRAFT" },
        select: { opportunityId: true },
        distinct: ["opportunityId"],
      })
    : [];
  const opportunityIdsWithCoverLetter = new Set(coverLetterDocs.map((d) => d.opportunityId));

  const withCoverLetter = applied.filter((o) => opportunityIdsWithCoverLetter.has(o.id));
  const withoutCoverLetter = applied.filter((o) => !opportunityIdsWithCoverLetter.has(o.id));
  const responsesWith = withCoverLetter.filter((o) => everReached(o, RESPONSE_STATUSES)).length;
  const responsesWithout = withoutCoverLetter.filter((o) => everReached(o, RESPONSE_STATUSES)).length;

  return {
    totalApplications,
    totalInterviews,
    totalOffers,
    responseRate: computeRate(totalApplications, totalResponses),
    interviewRate: computeRate(totalApplications, totalInterviews),
    offerRate: computeRate(totalApplications, totalOffers),
    resumePerformance,
    coverLetterResponseRateWith:
      withCoverLetter.length > 0 ? computeRate(withCoverLetter.length, responsesWith) : null,
    coverLetterResponseRateWithout:
      withoutCoverLetter.length > 0 ? computeRate(withoutCoverLetter.length, responsesWithout) : null,
    coverLetterApplicationsWith: withCoverLetter.length,
    coverLetterApplicationsWithout: withoutCoverLetter.length,
    bestCompanies: groupResponseRates(applied, (o) => o.companyName).slice(0, 5),
    bestRoles: groupResponseRates(applied, (o) => o.title).slice(0, 5),
    bestLocations: groupResponseRates(applied, (o) => o.location).slice(0, 5),
  };
}
