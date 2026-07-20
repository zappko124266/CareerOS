import type { JobMatchFactors } from "./types";
import type { DiscoveredCompany, DiscoveredListing } from "@/generated/prisma/client";

const SHELF_SIZE = 8;

const INTERNSHIP_KEYWORDS = ["intern", "internship", "campus", "graduate", "new grad", "trainee"];

export interface DiscoveryShelf<T> {
  key: string;
  title: string;
  description: string;
  items: T[];
}

/** Sprint 9, Module 9 — AI Discovery Feed shelves. Every shelf is a pure
 * filter/sort over the same already-scored `DiscoveredListing`/
 * `DiscoveredCompany` rows the flat feed already fetched — no new AI
 * calls, no new queries, same "code-computed, cheap, instant" discipline
 * as Opportunity Score V2. A shelf with no matching rows is simply
 * omitted by the caller rather than rendered empty. */
export function buildDiscoveryShelves(
  listings: DiscoveredListing[],
  companies: DiscoveredCompany[],
): {
  jobShelves: DiscoveryShelf<DiscoveredListing>[];
  companyShelves: DiscoveryShelf<DiscoveredCompany>[];
} {
  // `listings` already arrives ordered `[{matchScore:"desc"},{createdAt:"desc"}]`
  // from `listDiscoveredListings` — Best Match is that order, untouched.
  const bestMatch = listings.slice(0, SHELF_SIZE);

  const highestSalary = listings
    .filter((listing) => listing.salaryMax !== null)
    .sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0))
    .slice(0, SHELF_SIZE);

  const fastestHiring = listings
    .map((listing) => ({
      listing,
      factors: listing.matchFactors as unknown as JobMatchFactors | null,
    }))
    .filter(({ factors }) => factors?.recentHiringActivity.available)
    .sort((a, b) => b.factors!.recentHiringActivity.score - a.factors!.recentHiringActivity.score)
    .slice(0, SHELF_SIZE)
    .map(({ listing }) => listing);

  const remotePicks = listings.filter((listing) => listing.remote).slice(0, SHELF_SIZE);

  const internshipsAndCampus = listings
    .filter((listing) => {
      const haystack = `${listing.title} ${listing.employmentType ?? ""}`.toLowerCase();
      return INTERNSHIP_KEYWORDS.some((keyword) => haystack.includes(keyword));
    })
    .slice(0, SHELF_SIZE);

  const jobShelves: DiscoveryShelf<DiscoveredListing>[] = [
    {
      key: "best-match",
      title: "Today's Best",
      description: "Your highest-scoring new listings.",
      items: bestMatch,
    },
    {
      key: "highest-salary",
      title: "Highest Salary",
      description: "New listings with the highest stated maximum salary.",
      items: highestSalary,
    },
    {
      key: "fastest-hiring",
      title: "Fastest Hiring",
      description: "Companies with the most recent hiring activity on file.",
      items: fastestHiring,
    },
    {
      key: "remote-picks",
      title: "Remote Picks",
      description: "New listings marked remote.",
      items: remotePicks,
    },
    {
      key: "internships-campus",
      title: "Internships & Campus",
      description: "Listings mentioning internships, campus, or new-grad hiring.",
      items: internshipsAndCampus,
    },
  ];

  const newCompanies = companies.slice(0, SHELF_SIZE);

  const companyShelves: DiscoveryShelf<DiscoveredCompany>[] = [
    {
      key: "new-companies",
      title: "Companies to Contact",
      description: "Newly discovered companies matched to your preferences.",
      items: newCompanies,
    },
  ];

  return { jobShelves, companyShelves };
}
