import type { OpportunitySource } from "@/generated/prisma/client";

/**
 * The Connector Marketplace's full catalog — every platform the
 * marketplace UI can show, search, filter, and categorize, whether or not
 * CareerOS can actually search it automatically today. Adding a new
 * catalog-only entry (the common case for this sprint's 34-platform
 * request) is a one-line addition here — no schema migration, no UI
 * change, satisfying "future connectors must require zero UI redesign".
 *
 * `hasLiveSearch: true` entries have a real `OpportunityProviderAdapter`
 * in `features/opportunities/providers/` and an `opportunitySource` value
 * (see `prisma/schema.prisma`'s `OpportunitySource` enum) — those DO need
 * a migration to add, same as before this sprint.
 *
 * Every `hasLiveSearch: false` entry is honest about why: most major job
 * boards (LinkedIn, Naukri, Indeed, Glassdoor, Monster, etc.) either
 * prohibit third-party automated scraping in their Terms of Service or
 * only offer partner APIs that require a business relationship CareerOS
 * doesn't have — building a scraper for any of these would violate the
 * sprint's own "respect each platform's terms of service" rule. They're
 * still fully part of the marketplace (searchable, categorizable,
 * favoritable) so the user can see the full landscape and be pointed to
 * the platform's own site — the same "say so plainly instead of faking
 * it" discipline as `AccountConnection`'s `NOT_AVAILABLE` status.
 */

export type ConnectorCategory =
  | "GLOBAL_JOB_BOARD"
  | "REGIONAL_JOB_BOARD"
  | "TECH_RECRUITING"
  | "STARTUP"
  | "FREELANCE_CONTRACT"
  | "GOVERNMENT"
  | "ATS_HOSTED_CAREERS";

export const CONNECTOR_CATEGORY_LABEL: Record<ConnectorCategory, string> = {
  GLOBAL_JOB_BOARD: "Global Job Board",
  REGIONAL_JOB_BOARD: "Regional Job Board",
  TECH_RECRUITING: "Tech Recruiting",
  STARTUP: "Startup Hiring",
  FREELANCE_CONTRACT: "Freelance / Contract",
  GOVERNMENT: "Government",
  ATS_HOSTED_CAREERS: "ATS-Hosted Careers",
};

export interface ConnectorCatalogEntry {
  id: string;
  name: string;
  category: ConnectorCategory;
  region: string;
  description: string;
  websiteUrl: string;
  hasLiveSearch: boolean;
  opportunitySource?: OpportunitySource;
  requiresApiKey: boolean;
  /** Why automation isn't available, shown when `hasLiveSearch` is false. */
  unavailableReason?: string;
}

export const CONNECTOR_CATALOG: ConnectorCatalogEntry[] = [
  {
    id: "adzuna",
    name: "Adzuna",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "Aggregated job listings across dozens of countries.",
    websiteUrl: "https://www.adzuna.com",
    hasLiveSearch: true,
    opportunitySource: "ADZUNA",
    requiresApiKey: true,
  },
  {
    id: "jooble",
    name: "Jooble",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "Job search aggregator with a public partner API.",
    websiteUrl: "https://jooble.org",
    hasLiveSearch: true,
    opportunitySource: "JOOBLE",
    requiresApiKey: true,
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    category: "GLOBAL_JOB_BOARD",
    region: "Europe",
    description: "Tech-focused job board with an open, public job board API.",
    websiteUrl: "https://www.arbeitnow.com",
    hasLiveSearch: true,
    opportunitySource: "ARBEITNOW",
    requiresApiKey: false,
  },
  {
    id: "remoteok",
    name: "RemoteOK",
    category: "GLOBAL_JOB_BOARD",
    region: "Global (remote)",
    description: "Remote-first job board with an open public API.",
    websiteUrl: "https://remoteok.com",
    hasLiveSearch: true,
    opportunitySource: "REMOTEOK",
    requiresApiKey: false,
  },
  {
    id: "greenhouse",
    name: "Greenhouse-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description:
      "Company career pages built on Greenhouse — searched via Greenhouse's own public job board API, designed for exactly this kind of external embedding.",
    websiteUrl: "https://www.greenhouse.io",
    hasLiveSearch: true,
    opportunitySource: "GREENHOUSE",
    requiresApiKey: false,
  },
  {
    id: "lever",
    name: "Lever-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description:
      "Company career pages built on Lever — searched via Lever's own public postings API.",
    websiteUrl: "https://www.lever.co",
    hasLiveSearch: true,
    opportunitySource: "LEVER",
    requiresApiKey: false,
  },
  {
    id: "usajobs",
    name: "USAJobs",
    category: "GOVERNMENT",
    region: "United States",
    description: "The U.S. federal government's official job board and public API.",
    websiteUrl: "https://www.usajobs.gov",
    hasLiveSearch: true,
    opportunitySource: "USAJOBS",
    requiresApiKey: true,
  },
  {
    id: "reed",
    name: "Reed",
    category: "REGIONAL_JOB_BOARD",
    region: "United Kingdom",
    description: "UK job board with an official public API.",
    websiteUrl: "https://www.reed.co.uk",
    hasLiveSearch: true,
    opportunitySource: "REED",
    requiresApiKey: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn Jobs",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "The largest professional network's job board.",
    websiteUrl: "https://www.linkedin.com/jobs",
    hasLiveSearch: false,
    unavailableReason:
      "LinkedIn's Terms of Service prohibit automated scraping, and its Jobs API is restricted to approved partners CareerOS isn't one of.",
    requiresApiKey: false,
  },
  {
    id: "naukri",
    name: "Naukri",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "India's largest job portal.",
    websiteUrl: "https://www.naukri.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "indeed",
    name: "Indeed",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "One of the largest global job search engines.",
    websiteUrl: "https://www.indeed.com",
    hasLiveSearch: false,
    unavailableReason:
      "Indeed's public Publisher API program is closed to new integrations.",
    requiresApiKey: false,
  },
  {
    id: "foundit",
    name: "Foundit (Monster India)",
    category: "REGIONAL_JOB_BOARD",
    region: "India / APAC",
    description: "Major job portal across India and APAC.",
    websiteUrl: "https://www.foundit.in",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "shine",
    name: "Shine",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "India-focused job portal.",
    websiteUrl: "https://www.shine.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "timesjobs",
    name: "TimesJobs",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "India-focused job portal.",
    websiteUrl: "https://www.timesjobs.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "glassdoor",
    name: "Glassdoor",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "Job listings alongside company reviews and salary data.",
    websiteUrl: "https://www.glassdoor.com",
    hasLiveSearch: false,
    unavailableReason:
      "Glassdoor's Terms of Service prohibit automated scraping; its API is not publicly self-serve.",
    requiresApiKey: false,
  },
  {
    id: "cutshort",
    name: "Cutshort",
    category: "TECH_RECRUITING",
    region: "India",
    description: "AI-matched tech hiring platform.",
    websiteUrl: "https://cutshort.io",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "instahyre",
    name: "Instahyre",
    category: "TECH_RECRUITING",
    region: "India",
    description: "Curated tech hiring platform.",
    websiteUrl: "https://www.instahyre.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "wellfound",
    name: "Wellfound",
    category: "STARTUP",
    region: "Global",
    description: "Startup jobs (formerly AngelList Talent).",
    websiteUrl: "https://wellfound.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "apna",
    name: "Apna",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "India-focused jobs and professional community app.",
    websiteUrl: "https://apna.co",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "workindia",
    name: "WorkIndia",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "Blue/grey-collar and entry-level jobs across India.",
    websiteUrl: "https://www.workindia.in",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "internshala",
    name: "Internshala",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "Internships and entry-level jobs across India.",
    websiteUrl: "https://internshala.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "freshersworld",
    name: "Freshersworld",
    category: "REGIONAL_JOB_BOARD",
    region: "India",
    description: "Entry-level and campus hiring across India.",
    websiteUrl: "https://www.freshersworld.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "hirist",
    name: "Hirist",
    category: "TECH_RECRUITING",
    region: "India",
    description: "Tech-focused hiring platform.",
    websiteUrl: "https://www.hirist.tech",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "monster",
    name: "Monster",
    category: "GLOBAL_JOB_BOARD",
    region: "Global",
    description: "Long-running global job board.",
    websiteUrl: "https://www.monster.com",
    hasLiveSearch: false,
    unavailableReason:
      "Monster's public API program requires an approved partner relationship.",
    requiresApiKey: false,
  },
  {
    id: "dice",
    name: "Dice",
    category: "TECH_RECRUITING",
    region: "United States",
    description: "Tech-focused job board.",
    websiteUrl: "https://www.dice.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "ziprecruiter",
    name: "ZipRecruiter",
    category: "GLOBAL_JOB_BOARD",
    region: "United States",
    description: "Job board with employer-side distribution network.",
    websiteUrl: "https://www.ziprecruiter.com",
    hasLiveSearch: false,
    unavailableReason:
      "ZipRecruiter's API requires an approved publisher partnership CareerOS doesn't have.",
    requiresApiKey: false,
  },
  {
    id: "totaljobs",
    name: "TotalJobs",
    category: "REGIONAL_JOB_BOARD",
    region: "United Kingdom",
    description: "UK job board.",
    websiteUrl: "https://www.totaljobs.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "seek",
    name: "SEEK",
    category: "REGIONAL_JOB_BOARD",
    region: "Australia / New Zealand",
    description: "Leading job board across Australia and New Zealand.",
    websiteUrl: "https://www.seek.com.au",
    hasLiveSearch: false,
    unavailableReason:
      "SEEK's API requires an approved partner relationship CareerOS doesn't have.",
    requiresApiKey: false,
  },
  {
    id: "jobstreet",
    name: "JobStreet",
    category: "REGIONAL_JOB_BOARD",
    region: "Southeast Asia",
    description: "Leading job board across Southeast Asia.",
    websiteUrl: "https://www.jobstreet.com",
    hasLiveSearch: false,
    unavailableReason: "No public search API is available for third-party integration.",
    requiresApiKey: false,
  },
  {
    id: "careerbuilder",
    name: "CareerBuilder",
    category: "GLOBAL_JOB_BOARD",
    region: "United States",
    description: "Long-running U.S. job board.",
    websiteUrl: "https://www.careerbuilder.com",
    hasLiveSearch: false,
    unavailableReason:
      "CareerBuilder's API requires an approved partner relationship CareerOS doesn't have.",
    requiresApiKey: false,
  },
  {
    id: "flexjobs",
    name: "FlexJobs",
    category: "FREELANCE_CONTRACT",
    region: "Global",
    description: "Curated remote and flexible job listings (subscription-gated).",
    websiteUrl: "https://www.flexjobs.com",
    hasLiveSearch: false,
    unavailableReason: "Listings sit behind a paid subscription with no public search API.",
    requiresApiKey: false,
  },
  {
    id: "smartrecruiters",
    name: "SmartRecruiters-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description: "Company career pages built on SmartRecruiters.",
    websiteUrl: "https://www.smartrecruiters.com",
    hasLiveSearch: false,
    unavailableReason:
      "SmartRecruiters exposes a public API per company, but has no directory of participating companies — a future connector, not this sprint's.",
    requiresApiKey: false,
  },
  {
    id: "workday",
    name: "Workday-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description: "Company career pages built on Workday.",
    websiteUrl: "https://www.workday.com",
    hasLiveSearch: false,
    unavailableReason:
      "Workday career sites' data endpoints aren't officially documented for external use and vary by tenant.",
    requiresApiKey: false,
  },
  {
    id: "oracle",
    name: "Oracle-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description: "Company career pages built on Oracle Recruiting.",
    websiteUrl: "https://www.oracle.com/human-capital-management/recruiting/",
    hasLiveSearch: false,
    unavailableReason:
      "No officially documented public search API for external use.",
    requiresApiKey: false,
  },
  {
    id: "successfactors",
    name: "SAP SuccessFactors-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description: "Company career pages built on SAP SuccessFactors.",
    websiteUrl: "https://www.sap.com/products/hcm/recruiting-hiring.html",
    hasLiveSearch: false,
    unavailableReason:
      "No officially documented public search API for external use.",
    requiresApiKey: false,
  },
  {
    id: "taleo",
    name: "Taleo-hosted careers",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description: "Company career pages built on Oracle Taleo.",
    websiteUrl: "https://www.oracle.com/human-capital-management/taleo/",
    hasLiveSearch: false,
    unavailableReason:
      "No officially documented public search API for external use.",
    requiresApiKey: false,
  },
  {
    id: "company-career-pages",
    name: "Generic company career pages",
    category: "ATS_HOSTED_CAREERS",
    region: "Global",
    description:
      "Any company's own careers page not hosted on a connector above — CareerOS can't safely automate arbitrary sites without per-site permission.",
    websiteUrl: "",
    hasLiveSearch: false,
    unavailableReason:
      "Automating arbitrary, unknown websites without their permission isn't something CareerOS will do — use Speculative Applications in Job Discovery to be guided through this manually instead.",
    requiresApiKey: false,
  },
];

export function getConnectorCatalogEntry(id: string): ConnectorCatalogEntry | undefined {
  return CONNECTOR_CATALOG.find((entry) => entry.id === id);
}

export function getLiveSearchCatalogEntries(): ConnectorCatalogEntry[] {
  return CONNECTOR_CATALOG.filter((entry) => entry.hasLiveSearch);
}
