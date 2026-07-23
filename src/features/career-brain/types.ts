import type { CareerEvent, InterviewEvent } from "@/features/career-agent/types";
import type { ApplicationAnalytics } from "@/features/analytics/service";
import type { AutomationExecution } from "@/features/automation/types";
import type { CareerHealthResultV2 } from "@/features/career/types";
import type { NextStep } from "@/features/coach/recommend-next-step";
import type { ConnectionSummary } from "@/features/connectors/manager";
import type { ActivityItem } from "@/features/dashboard/types";
import type { GmailIntelligenceSummary } from "@/features/gmail-intelligence/types";
import type {
  AvailabilityWindow,
  ExperienceLevel,
  SearchPriority,
} from "@/features/discovery/types";
import type { OpportunitySyncEvent } from "@/features/discovery/sync-events";
import type { getLatestInterviewPrepForUser } from "@/features/interviews/queries";
import type { listRecruitersForUser } from "@/features/recruiters/queries";
import type { InterviewLifecycleLabel } from "@/features/interviews/intelligence/tracking";
import type { listApplicationExecutionsForUser } from "@/features/application-engine/queries";
import type { EnrichedRecruiter, NetworkHealthSummary } from "@/features/recruiters/orchestrator";
import type { RelationshipHealth } from "@/features/recruiters/scoring";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import type { ResumeMatchProfile } from "@/features/opportunities/match";
import type { OpportunityType } from "@/features/opportunities/types";
import type { ResumeCertification, ResumeEducation } from "@/features/resume/schema";
import type {
  CareerGoal,
  ConnectionProvider,
  DiscoveryPreference,
  DiscoveryRun,
  Opportunity,
  Referral,
  ResumeAnalysis,
} from "@/generated/prisma/client";
import type { UserDTO } from "@/lib/auth/dto";

/**
 * Career Profile — Sprint 4. Skills/Experience/Education/Career
 * stage/Goals/Preferences, all reused as-is from onboarding
 * (`DiscoveryPreference`/`CareerGoal`) and the parsed resume
 * (`ResumeMatchProfile`) — no new fields collected, no new taxonomy.
 */
export interface CareerProfile {
  skills: string[];
  currentTitle: string | null;
  yearsOfExperience: number | null;
  educationLevel: string | null;
  careerStage: ExperienceLevel | null;
  goals: {
    targetRole: string | null;
    targetTimeline: string | null;
    targetCompanies: string[];
    targetSalaryMin: number | null;
    targetSalaryMax: number | null;
    targetLocation: string | null;
  };
  preferences: {
    locationSummary: string | null;
    remote: boolean;
    hybrid: boolean;
    onsite: boolean;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentTypes: OpportunityType[];
    searchPriorities: SearchPriority[];
    existingJobPortals: string[];
    urgency: AvailabilityWindow | null;
  };
}

/**
 * Resume Intelligence — Sprint 4. Strengths/weaknesses are the existing
 * ATS breakdown dimensions (`AtsScoreBreakdownSchema`), not a new
 * scoring model. `missingSkills` is aggregated from the same Priority
 * Queue rows (Sprint 2's Opportunity Intelligence Engine) the dashboard
 * already computes for Recommended Opportunities — no second match
 * computation.
 */
export interface ResumeIntelligence {
  hasResume: boolean;
  overallScore: number | null;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  certifications: ResumeCertification[];
  education: ResumeEducation[];
  experienceQuality: { score: number | null; explanation: string };
}

/** Application Intelligence — Sprint 4. A reshaped subset of
 * `ApplicationAnalytics` (`features/analytics/service.ts`), the single
 * already-existing source of every application aggregate — no parallel
 * counting logic. */
export interface ApplicationIntelligence {
  totalApplications: number;
  interviewRate: number;
  offerRate: number;
  responseRate: number;
  totalRejections: number;
  rejectionRate: number;
  bestCompanies: ApplicationAnalytics["bestCompanies"];
  bestRoles: ApplicationAnalytics["bestRoles"];
  coverLetterResponseRateWith: number | null;
  coverLetterResponseRateWithout: number | null;
}

/** Job Intelligence — Sprint 4. A direct reshape of the onboarding
 * `DiscoveryPreference` row plus the saved-opportunity count already
 * fetched — no new query, no new preference taxonomy. */
export interface JobIntelligence {
  dreamCompanies: string[];
  preferredIndustries: string[];
  locationSummary: string | null;
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  openToRelocation: boolean;
  savedOpportunityCount: number;
}

/**
 * Skill Intelligence — Sprint 4. `missingSkills`/`recommendedNextSkills`
 * are derived by counting how often each skill shows up as missing
 * across the user's own saved-opportunity Priority Queue rows — a real,
 * user-specific signal, not a market-wide guess. `trendingSkills` is a
 * documented future extension point (would need an external market-data
 * source this codebase doesn't have) — left empty rather than
 * fabricated.
 */
export interface SkillIntelligence {
  currentSkills: string[];
  missingSkills: { skill: string; frequency: number }[];
  recommendedNextSkills: string[];
  trendingSkills: string[];
}

/**
 * The Career Brain — Sprint 4's single orchestration layer. `raw` holds
 * every already-fetched/already-computed piece so that `CoachContext`
 * (`features/coach/context.ts`) and `CareerAgentSnapshot`
 * (`features/career-agent/agent.ts`) can be pure derivations over this
 * object instead of running their own queries.
 */
export interface CareerBrain {
  userId: string;
  profile: CareerProfile;
  resumeIntelligence: ResumeIntelligence;
  applicationIntelligence: ApplicationIntelligence;
  jobIntelligence: JobIntelligence;
  skillIntelligence: SkillIntelligence;
  /** Career Memory — Sprint 4. Reuses Sprint 3's `CareerEvent`/
   * `buildCareerInboxEvents` as-is: computed on demand from real rows
   * every call, no duplicate storage. Ready for future persistence the
   * same way `generateAndPersistCareerHealth` wraps
   * `computeCareerHealthV2` — no new Prisma model added now since none
   * was asked for. */
  careerMemory: CareerEvent[];
  raw: {
    user: UserDTO;
    resumeCount: number;
    latestResumeId: string | null;
    latestAnalysis: ResumeAnalysis | null;
    linkedInAnalyzed: boolean;
    latestInterviewPrep: Awaited<ReturnType<typeof getLatestInterviewPrepForUser>>;
    interviewHref: string;
    opportunities: Opportunity[];
    resumeProfile: ResumeMatchProfile | null;
    recentActivity: ActivityItem[];
    applicationAnalytics: ApplicationAnalytics;
    preference: DiscoveryPreference | null;
    careerGoal: CareerGoal | null;
    health: CareerHealthResultV2 | null;
    latestDiscoveryRun: DiscoveryRun | null;
    interviewEvents: InterviewEvent[];
    /** Sprint 5 (Automation Engine) — real execution history from
     * `features/automation/history.ts`'s `listAutomationExecutions`,
     * feeding both Career Memory and the Career Agent's
     * `recentExecutions`. */
    automationExecutions: AutomationExecution[];
    nextStep: NextStep;
    priorityQueueRows: PriorityQueueRow[];
    /** Sprint 16 — fetched once here (`listConnectionSummaries`) so both
     * the Autonomous Career Agent (`features/autonomous-agent/orchestrator.ts`)
     * and Gmail Intelligence (`features/gmail-intelligence/orchestrator.ts`)
     * reuse it instead of each independently re-querying the Connection
     * Manager. Token-free — see `ConnectionSummary`'s own doc comment. */
    connectionSummaries: ConnectionSummary[];
    /** Sprint 17 — existence-only (`Offer.opportunityId`), the one new
     * query Calendar Intelligence needed; reused by
     * `deriveInterviewLifecycleLabel` to distinguish "Offer Pending" from
     * "Offer Received" without a second per-interview lookup. */
    offerOpportunityIds: string[];
    /** Sprint 18 — one query (`listApplicationExecutionsForUser`),
     * reused by `applicationEngineExecutionSummary` below and by the
     * Autonomous Career Agent — never a second query per dashboard
     * field. */
    applicationExecutions: Awaited<ReturnType<typeof listApplicationExecutionsForUser>>;
    /** Sprint 19 — reuses the existing `listDiscoveryRuns` query
     * (already used elsewhere for run history) rather than a new
     * "runs since X" query; `opportunitySyncSummary` below filters this
     * same array to today's calendar date. */
    recentDiscoveryRuns: DiscoveryRun[];
    /** Sprint 19 — one query (`listRecentOpportunitySyncEvents`), reused
     * by `opportunitySyncSummary` below for "high-impact changes." */
    opportunitySyncEvents: OpportunitySyncEvent[];
    /** Sprint 21 — pre-enrichment rows from `listRecruitersForUser`
     * (already widened to carry full interaction history, see that
     * function's own doc comment) — the "one additional recruiter query
     * batch" Module 16 allows. `recruiters`/`relationshipSummary`/
     * `networkHealth`/`pendingFollowUps` below are all pure derivations
     * over this same array. */
    recruiters: Awaited<ReturnType<typeof listRecruitersForUser>>;
  };
  /** Sprint 16 (Gmail Intelligence Engine) — Step 6's exact exposure list
   * (interview invitations, pending assessments, recent recruiter
   * activity, recent offers, recent rejections, unread career emails),
   * built from one query (`gmail-intelligence/memory.ts`'s
   * `listRecentGmailCareerEvents`) via the engine's own orchestrator. */
  gmailIntelligence: GmailIntelligenceSummary;
  /** Sprint 17 (Calendar Intelligence & Interview Management Engine) —
   * every field here is a pure derivation over `raw.interviewEvents`
   * (already widened to carry `meetingStatus`/`hasConflict`/etc.) and
   * `raw.connectionSummaries` — zero new queries beyond
   * `offerOpportunityIds` above. This is what Mission Control's
   * Interview/Calendar card and the Autonomous Career Agent's
   * interview-lifecycle signals both read, rather than each recomputing
   * `deriveInterviewLifecycleLabel` themselves (Hard Lock 1: Career
   * Brain remains the single source of truth). */
  interviewIntelligence: InterviewIntelligenceSummary;
  /** Sprint 18 (Autonomous Application Engine) — Mission Control's exact
   * exposure list (today's applications, waiting approval, submitted,
   * failed, Auto Apply status, connector availability), a pure
   * derivation over `raw.applicationExecutions` — the one new query
   * above — plus the real, already-registered connector capability
   * check (`listConnectorsWithCapability`). */
  applicationEngineExecutionSummary: ApplicationEngineExecutionSummary;
  /** Sprint 19 (Universal Opportunity Sync Engine) — Mission Control's
   * exact exposure list (new/updated/closed today, high-impact changes,
   * duplicate statistics), a pure derivation over `raw.recentDiscoveryRuns`
   * and `raw.opportunitySyncEvents` — both already fetched above, zero
   * further queries. */
  opportunitySyncSummary: OpportunitySyncSummary;
  /** Sprint 21 (Recruiter Intelligence & Networking Operating System),
   * Module 7 — every field below is a pure derivation
   * (`features/recruiters/orchestrator.ts`'s `buildRecruiterIntelligenceSummary`)
   * over the *one* additional query batch this sprint adds
   * (`raw.recruiters`/`raw.referrals` below) — no further queries. */
  recruiters: EnrichedRecruiter[];
  relationshipSummary: Record<RelationshipHealth, number>;
  networkHealth: NetworkHealthSummary;
  pendingFollowUps: EnrichedRecruiter[];
  referrals: Referral[];
}

export interface OpportunitySyncSummary {
  newToday: number;
  updatedToday: number;
  closedToday: number;
  duplicatesRemovedToday: number;
  requirementsChangedToday: number;
  /** Real salary increases only (`OpportunityChange.isImprovement`) —
   * never every change, which would bury the genuinely actionable ones. */
  highImpactChanges: OpportunitySyncEvent[];
}

export interface ApplicationEngineExecutionSummary {
  todaysCount: number;
  waitingApproval: CareerBrain["raw"]["applicationExecutions"];
  submittedCount: number;
  failedCount: number;
  manualRequiredCount: number;
  /** Real connector ids with `supportsEasyApply: true` — empty today
   * (Hard Lock: honest, never fabricated availability). */
  easyApplyConnectorIds: string[];
}

export interface EnrichedInterviewEvent extends InterviewEvent {
  lifecycleLabel: InterviewLifecycleLabel;
  /** Sprint 20 (Interview Intelligence) — real days since the last
   * `stageHistory` transition, from the same `buildInterviewStageProgress`
   * the per-opportunity Stage Tracker uses (`interviews/intelligence/
   * stage-tracker.ts`) — one shared derivation, not a second one for the
   * dashboard. */
  daysWaiting: number;
}

export interface CalendarHealthSummary {
  connectedProviders: ConnectionProvider[];
  /** `EXPIRED`/`ERROR` among the calendar-relevant providers — the same
   * real signal the Autonomous Agent's `WAITING_FOR_CONNECTOR` status
   * already watches, reused here for Mission Control's "Calendar Health"
   * display rather than a second connection-health computation. */
  brokenProviders: ConnectionProvider[];
}

export interface InterviewIntelligenceSummary {
  todaysInterviews: EnrichedInterviewEvent[];
  upcomingInterviews: EnrichedInterviewEvent[];
  conflicts: EnrichedInterviewEvent[];
  calendarHealth: CalendarHealthSummary;
  /** Sprint 20 (Interview Intelligence & Interview Operating System),
   * Module 2/12 — interviews still mid-pipeline (not yet at OFFER/
   * ACCEPTED/REJECTED/WITHDRAWN, meeting not CANCELLED) whose real
   * `daysWaiting` exceeds `WAITING_TOO_LONG_THRESHOLD_DAYS`
   * (`career-brain/brain.ts`). Feeds Mission Control's "Waiting for
   * Response" and the Autonomous Career Agent's "waiting too long"
   * recommendation — both read this same list, never re-derive it. */
  waitingTooLong: EnrichedInterviewEvent[];
  /** Sprint 20 — interviews whose lifecycle has reached OFFER_PENDING or
   * OFFER_RECEIVED (`deriveInterviewLifecycleLabel`, reused as-is). */
  offers: EnrichedInterviewEvent[];
  /** Sprint 20 — interviews whose `lifecycleLabel` is `PREPARING` — the
   * label `deriveInterviewLifecycleLabel` already computes for "no round
   * scheduled yet / not today or tomorrow," reused here for Mission
   * Control's "Needs Preparation" list rather than a new label. */
  needsPreparation: EnrichedInterviewEvent[];
}
