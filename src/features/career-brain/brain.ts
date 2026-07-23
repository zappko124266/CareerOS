import "server-only";

import { computeApplicationAnalytics } from "@/features/analytics/service";
import { listApplicationExecutionsForUser } from "@/features/application-engine/queries";
import { buildCareerInboxEvents } from "@/features/career-agent/inbox";
import { listAutomationExecutions } from "@/features/automation/history";
import { computeCareerHealthV2 } from "@/features/career/health";
import { getCareerGoal } from "@/features/career/queries";
import { recommendNextStep } from "@/features/coach/recommend-next-step";
import { listConnectionSummaries } from "@/features/connectors/manager";
import { listConnectorsWithCapability } from "@/features/connectors/registry";
import { getDashboardData } from "@/features/dashboard/queries";
import { getGmailIntelligenceReport } from "@/features/gmail-intelligence/orchestrator";
import { getDiscoveryPreference, getLatestDiscoveryRun, listDiscoveryRuns } from "@/features/discovery/queries";
import { listRecentOpportunitySyncEvents } from "@/features/discovery/sync-events";
import { buildInterviewStageProgress } from "@/features/interviews/intelligence/stage-tracker";
import { deriveInterviewLifecycleLabel } from "@/features/interviews/intelligence/tracking";
import {
  getLatestInterviewPrepForUser,
  listInterviewEventsForUser,
  listOfferOpportunityIdsForUser,
} from "@/features/interviews/queries";
import { getLatestLinkedInAnalysis } from "@/features/linkedin-profile/queries";
import { buildRecruiterIntelligenceSummary } from "@/features/recruiters/orchestrator";
import { listRecruitersForUser, listReferralsForUser } from "@/features/recruiters/queries";
import { toRecruiterCareerEvents } from "@/features/recruiters/timeline";
import { buildOpportunityIntelligence, type OpportunityIntelligenceContext } from "@/features/opportunities/intelligence";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import { listOpportunitiesForUser } from "@/features/opportunities/queries";
import { OpportunitySkillsSchema } from "@/features/opportunities/schema";
import { getResumeMatchProfile } from "@/features/opportunities/service";
import type { ConnectionProvider } from "@/generated/prisma/client";
import type { UserDTO } from "@/lib/auth/dto";

import { buildApplicationIntelligence } from "./application-intelligence";
import { buildCareerProfile } from "./profile";
import { buildJobIntelligence } from "./job-intelligence";
import { buildResumeIntelligence } from "./resume-intelligence";
import { buildSkillIntelligence } from "./skill-intelligence";
import type {
  ApplicationEngineExecutionSummary,
  CalendarHealthSummary,
  CareerBrain,
  EnrichedInterviewEvent,
  InterviewIntelligenceSummary,
  OpportunitySyncSummary,
} from "./types";

const CALENDAR_PROVIDERS: ConnectionProvider[] = ["GOOGLE", "MICROSOFT"];

/**
 * The Career Brain — Sprint 4's single orchestration layer. Every query
 * this codebase's Coach Context and Career Agent used to run themselves
 * (11 total, split across `features/coach/context.ts` and
 * `features/career-agent/agent.ts`) happens here exactly once. Both of
 * those files are refactored (this sprint) into pure derivations over
 * this object — see `buildCoachContext` (`features/coach/context.ts`)
 * and `getCareerAgentSnapshot` (`features/career-agent/agent.ts`).
 */
export async function getCareerBrain(user: UserDTO): Promise<CareerBrain> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    dashboardData,
    latestLinkedInAnalysis,
    opportunities,
    applicationAnalytics,
    latestInterviewPrep,
    preference,
    careerGoal,
    resumeProfile,
    health,
    latestDiscoveryRun,
    interviewEvents,
    automationExecutions,
    connectionSummaries,
    offerOpportunityIds,
    applicationExecutions,
    recentDiscoveryRuns,
    opportunitySyncEvents,
    recruiters,
    referrals,
  ] = await Promise.all([
    getDashboardData(user.id),
    getLatestLinkedInAnalysis(user.id),
    listOpportunitiesForUser(user.id),
    computeApplicationAnalytics(user.id),
    getLatestInterviewPrepForUser(user.id),
    getDiscoveryPreference(user.id),
    getCareerGoal(user.id),
    getResumeMatchProfile(user.id),
    computeCareerHealthV2(user.id).catch(() => null),
    getLatestDiscoveryRun(user.id),
    listInterviewEventsForUser(user.id),
    // 20, not 10 — this now spans 3 task types (job discovery, follow-up
    // recommendations, and Sprint 9's application engine review), so a
    // slightly wider window keeps all three represented instead of one
    // noisy task type crowding another out of the same query.
    listAutomationExecutions(user.id, 20),
    // Sprint 16 — fetched once here so the Autonomous Career Agent and
    // Gmail Intelligence both reuse it (see `types.ts`'s doc comment on
    // `raw.connectionSummaries`) instead of each querying it themselves.
    listConnectionSummaries(user.id),
    // Sprint 17 — existence-only, see `types.ts`'s doc comment on
    // `raw.offerOpportunityIds`.
    listOfferOpportunityIdsForUser(user.id),
    // Sprint 18 — see `types.ts`'s doc comment on `raw.applicationExecutions`.
    listApplicationExecutionsForUser(user.id),
    // Sprint 19 — reuses the existing run-history query; see `types.ts`'s
    // doc comment on `raw.recentDiscoveryRuns`.
    listDiscoveryRuns(user.id, 20),
    // Sprint 19 — see `types.ts`'s doc comment on `raw.opportunitySyncEvents`.
    listRecentOpportunitySyncEvents(user.id, todayStart),
    // Sprint 21 — the one additional recruiter query batch (Module 16),
    // batched into this same `Promise.all` rather than a second
    // round-trip; see `types.ts`'s doc comment on `raw.recruiters`.
    listRecruitersForUser(user.id),
    listReferralsForUser(user.id),
  ]);

  // Depends on `connectionSummaries` above (to know whether Google is
  // connected without a second Connection Manager query) — a real, small
  // sequential step after the batch, not folded into it, since Gmail
  // Intelligence's own two queries (`listRecentGmailCareerEvents`,
  // `getLastGmailSyncedAt`) are otherwise independent of everything else
  // above and this keeps `getGmailIntelligenceReport`'s signature honest
  // about that dependency rather than hiding it.
  const gmailIntelligenceReport = await getGmailIntelligenceReport(user.id, connectionSummaries);

  const interviewHref = latestInterviewPrep
    ? `/opportunities/${latestInterviewPrep.interview.opportunity.id}`
    : "/opportunities";

  const nextStep = recommendNextStep({
    resumeCount: dashboardData.resumeCount,
    latestResumeScore: dashboardData.latestAnalysis?.overallScore ?? null,
    linkedInOptimized: latestLinkedInAnalysis !== null,
    jobsFound: opportunities.length > 0,
    applicationsStarted: applicationAnalytics.totalApplications > 0,
    interviewReady: latestInterviewPrep !== null,
    interviewHref,
  });

  // Sprint 2's Opportunity Intelligence Engine, computed exactly once
  // here — reused by Recommended Opportunities (Career Agent), Resume
  // Intelligence's `missingSkills`, and Skill Intelligence.
  const intelligenceContext: OpportunityIntelligenceContext = {
    dreamCompanyNames: new Set(((preference?.preferredCompanies as string[]) ?? []).map((name) => name.toLowerCase())),
    urgency: (preference?.availability as OpportunityIntelligenceContext["urgency"]) ?? null,
  };
  const priorityQueueRows: PriorityQueueRow[] = opportunities.map((opportunity) => {
    const skills = OpportunitySkillsSchema.safeParse(opportunity.skills);
    return {
      opportunity,
      intelligence: buildOpportunityIntelligence(
        {
          title: opportunity.title,
          location: opportunity.location,
          remote: opportunity.remote,
          skills: skills.success ? skills.data : [],
          companyName: opportunity.companyName,
        },
        resumeProfile,
        intelligenceContext,
      ),
    };
  });
  const now = new Date();

  // Sprint 21 — Module 3's Career Memory adapter, over `recruiters`/
  // `referrals` already fetched above. No AI, no new query.
  const recruiterIntelligence = buildRecruiterIntelligenceSummary(recruiters, referrals, now);
  const recruiterEvents = recruiters.flatMap((recruiter) =>
    toRecruiterCareerEvents(
      recruiter,
      recruiter.interactions,
      referrals.filter((referral) => referral.recruiterId === recruiter.id),
    ),
  );

  const careerMemory = buildCareerInboxEvents({
    recentActivity: dashboardData.recentActivity,
    opportunities,
    interviewEvents,
    automationExecutions,
    gmailEvents: gmailIntelligenceReport.careerEvents,
    recruiterEvents,
  });

  // Sprint 17 — pure derivation over `interviewEvents` (already widened
  // to carry `meetingStatus`/`hasConflict`/etc., see
  // `interviews/queries.ts`) and `offerOpportunityIds`, both already
  // fetched above. No new query below this line.
  const offerOpportunityIdSet = new Set(offerOpportunityIds);
  const enrichedInterviews: EnrichedInterviewEvent[] = interviewEvents.map((event) => ({
    ...event,
    lifecycleLabel: deriveInterviewLifecycleLabel(
      { stage: event.stage, meetingStatus: event.meetingStatus, scheduledAt: event.scheduledAt },
      offerOpportunityIdSet.has(event.opportunity.id),
      now,
    ),
    // Sprint 20 — reuses the same Stage Tracker derivation the
    // per-opportunity workspace uses (`interviews/intelligence/
    // stage-tracker.ts`), fed by `stageHistory`/`createdAt` already on
    // `interviewEvents` (widened this sprint, no new query).
    daysWaiting: buildInterviewStageProgress(event, null, now).daysWaiting,
  }));

  const calendarHealth: CalendarHealthSummary = {
    connectedProviders: connectionSummaries
      .filter((summary) => CALENDAR_PROVIDERS.includes(summary.provider) && summary.status === "CONNECTED")
      .map((summary) => summary.provider),
    brokenProviders: connectionSummaries
      .filter(
        (summary) =>
          CALENDAR_PROVIDERS.includes(summary.provider) && (summary.status === "EXPIRED" || summary.status === "ERROR"),
      )
      .map((summary) => summary.provider),
  };

  // Sprint 20 — a real, mid-pipeline interview (not yet at an off-path or
  // terminal-offer stage, meeting not cancelled/completed) whose real
  // `daysWaiting` (from `stageHistory`) has crossed this threshold with
  // no recorded movement. A new, explicit constant — this codebase's
  // existing follow-up recommendation (`features/applications/service.ts`)
  // computes `daysSinceLastUpdate` but leaves the "is this too long"
  // judgment to the AI Router rather than a fixed number, so there was no
  // existing threshold to reuse for this deterministic dashboard signal.
  const WAITING_TOO_LONG_THRESHOLD_DAYS = 5;
  const NON_WAITING_STAGES = new Set(["OFFER", "ACCEPTED", "REJECTED", "WITHDRAWN"]);

  const interviewIntelligence: InterviewIntelligenceSummary = {
    todaysInterviews: enrichedInterviews.filter(
      (event) => event.scheduledAt !== null && event.scheduledAt.toDateString() === now.toDateString(),
    ),
    upcomingInterviews: enrichedInterviews
      .filter((event) => event.scheduledAt !== null && event.scheduledAt.getTime() > now.getTime())
      .sort((a, b) => a.scheduledAt!.getTime() - b.scheduledAt!.getTime()),
    conflicts: enrichedInterviews.filter((event) => event.hasConflict),
    calendarHealth,
    waitingTooLong: enrichedInterviews.filter(
      (event) =>
        !NON_WAITING_STAGES.has(event.stage) &&
        event.meetingStatus !== "CANCELLED" &&
        event.daysWaiting >= WAITING_TOO_LONG_THRESHOLD_DAYS,
    ),
    offers: enrichedInterviews.filter(
      (event) => event.lifecycleLabel === "OFFER_PENDING" || event.lifecycleLabel === "OFFER_RECEIVED",
    ),
    needsPreparation: enrichedInterviews.filter((event) => event.lifecycleLabel === "PREPARING"),
  };

  // Sprint 18 — pure derivation over `applicationExecutions` (already
  // fetched above) plus the real, already-registered connector registry
  // — no new query below this line.
  const applicationEngineExecutionSummary: ApplicationEngineExecutionSummary = {
    todaysCount: applicationExecutions.filter((execution) => execution.startedAt.toDateString() === now.toDateString())
      .length,
    waitingApproval: applicationExecutions.filter((execution) => execution.status === "WAITING_APPROVAL"),
    submittedCount: applicationExecutions.filter((execution) => execution.status === "SUBMITTED" || execution.status === "COMPLETED")
      .length,
    failedCount: applicationExecutions.filter((execution) => execution.status === "FAILED").length,
    manualRequiredCount: applicationExecutions.filter((execution) => execution.status === "MANUAL_REQUIRED").length,
    easyApplyConnectorIds: listConnectorsWithCapability("supportsEasyApply").map((connector) => connector.id),
  };

  // Sprint 19 — pure derivation over `recentDiscoveryRuns` and
  // `opportunitySyncEvents` (both already fetched above). "Today" sums
  // across every run that started today, not just the latest one, since
  // a user can trigger more than one run per day.
  const todaysRuns = recentDiscoveryRuns.filter((run) => run.startedAt.toDateString() === now.toDateString());
  const opportunitySyncSummary: OpportunitySyncSummary = {
    newToday: todaysRuns.reduce((sum, run) => sum + run.newJobsFound, 0),
    updatedToday: todaysRuns.reduce((sum, run) => sum + run.updatedJobsFound, 0),
    closedToday: todaysRuns.reduce((sum, run) => sum + run.closedJobsFound, 0),
    duplicatesRemovedToday: todaysRuns.reduce((sum, run) => sum + run.duplicatesFound, 0),
    requirementsChangedToday: opportunitySyncEvents.filter((event) =>
      event.changes.some((change) => change.type === "REQUIREMENTS_CHANGED"),
    ).length,
    highImpactChanges: opportunitySyncEvents.filter((event) => event.changes.some((change) => change.isImprovement)),
  };

  return {
    userId: user.id,
    profile: buildCareerProfile({
      skills: resumeProfile?.skills ?? [],
      currentTitle: resumeProfile?.currentTitle ?? null,
      preference,
      careerGoal,
    }),
    resumeIntelligence: buildResumeIntelligence({
      resumeCount: dashboardData.resumeCount,
      latestAnalysis: dashboardData.latestAnalysis,
      education: resumeProfile?.education ?? [],
      certifications: resumeProfile?.certifications ?? [],
      priorityQueueRows,
    }),
    applicationIntelligence: buildApplicationIntelligence(applicationAnalytics),
    jobIntelligence: buildJobIntelligence({
      preference,
      savedOpportunityCount: opportunities.length,
    }),
    skillIntelligence: buildSkillIntelligence({
      currentSkills: resumeProfile?.skills ?? [],
      priorityQueueRows,
    }),
    careerMemory,
    raw: {
      user,
      resumeCount: dashboardData.resumeCount,
      latestResumeId: dashboardData.latestResume?.id ?? null,
      latestAnalysis: dashboardData.latestAnalysis,
      linkedInAnalyzed: latestLinkedInAnalysis !== null,
      latestInterviewPrep,
      interviewHref,
      opportunities,
      resumeProfile,
      recentActivity: dashboardData.recentActivity,
      applicationAnalytics,
      preference,
      careerGoal,
      health,
      latestDiscoveryRun,
      interviewEvents,
      automationExecutions,
      nextStep,
      priorityQueueRows,
      connectionSummaries,
      offerOpportunityIds,
      applicationExecutions,
      recentDiscoveryRuns,
      opportunitySyncEvents,
      recruiters,
    },
    gmailIntelligence: gmailIntelligenceReport.summary,
    interviewIntelligence,
    applicationEngineExecutionSummary,
    opportunitySyncSummary,
    recruiters: recruiterIntelligence.recruiters,
    relationshipSummary: recruiterIntelligence.relationshipSummary,
    networkHealth: recruiterIntelligence.networkHealth,
    pendingFollowUps: recruiterIntelligence.pendingFollowUps,
    referrals: recruiterIntelligence.referrals,
  };
}
