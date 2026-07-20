import type { DiscoveredCompany, DiscoveryRun } from "@/generated/prisma/client";

export interface DiscoveryBriefingAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface DiscoveryBriefing {
  headline: string;
  detail: string;
  improvementNote: string | null;
  actions: DiscoveryBriefingAction[];
}

/**
 * The Daily Career Agent's briefing — entirely derived from the latest
 * real `DiscoveryRun` and its `DiscoveredCompany` rows, the same "no AI
 * call just to render a summary, only real persisted counts" discipline
 * as `dashboard/briefing.ts`'s `buildBriefing`. Never fabricates a number:
 * every count here is something `runDiscovery` actually wrote to the
 * database, and `improvementNote` only appears when a real eligibility
 * note exists from that run.
 */
export function buildDiscoveryBriefing(
  latestRun: DiscoveryRun | null,
  dreamEmployerMatches: DiscoveredCompany[],
  topEligibilityNote: string | null,
): DiscoveryBriefing {
  if (!latestRun) {
    return {
      headline: "Let's start discovering opportunities for you.",
      detail:
        "Set your preferences and CareerOS will continuously search for jobs and companies matching your profile — no more searching manually every day.",
      improvementNote: null,
      actions: [
        {
          id: "set-preferences",
          label: "Set discovery preferences",
          description: "Takes about a minute",
          href: "/opportunities/discovery?tab=preferences",
        },
      ],
    };
  }

  const ranAt = latestRun.completedAt ?? latestRun.startedAt;
  const timeLabel = ranAt.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  const detailParts = [
    `We found ${latestRun.newJobsFound} new opportunit${latestRun.newJobsFound === 1 ? "y" : "ies"} and ${latestRun.companiesFound} compan${latestRun.companiesFound === 1 ? "y" : "ies"} hiring`,
  ];

  if (dreamEmployerMatches.length > 0) {
    detailParts.push(
      `${dreamEmployerMatches.length} of them match a company on your preferred list`,
    );
  }

  return {
    headline: `Your last discovery run was ${timeLabel}.`,
    detail: `${detailParts.join(", ")}.`,
    improvementNote: topEligibilityNote,
    actions: [
      {
        id: "review-feed",
        label: "Review your discovery feed",
        description: "See what's new, ranked and explained",
        href: "/opportunities/discovery",
      },
    ],
  };
}
