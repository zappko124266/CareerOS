import type { ActivityItem } from "@/features/dashboard/types";
import type { AvailabilityWindow, SearchPriority } from "@/features/discovery/types";
import type { ResumeMatchProfile } from "@/features/opportunities/match";
import type { Opportunity, ResumeAnalysis } from "@/generated/prisma/client";
import type { UserDTO } from "@/lib/auth/dto";

import type { NextStep } from "./recommend-next-step";

/**
 * Coach Orchestrator — shared types.
 *
 * The orchestrator classifies a message into one of these intents and
 * hands off to whichever existing feature already owns that workflow —
 * it never implements resume/LinkedIn/job/interview/application logic
 * itself. See `workflows.ts` for the intent -> existing-feature mapping.
 */
export type CoachIntent =
  | "resume"
  | "jobs"
  | "linkedin"
  | "interview"
  | "applications"
  | "career_switch"
  | "salary"
  | "general_advice"
  | "unknown";

/**
 * Output of the classification step (the Decision Engine, Sprint 8's
 * `features/ai/decision-engine.ts`). `confidence`/`reason` are
 * deterministic today — tied to *how* a match was made (keyword vs none)
 * rather than a fabricated probability — and are exactly the fields a
 * model-backed classifier would fill with real output later, without
 * changing this shape.
 */
export interface ClassifierResult {
  intent: CoachIntent;
  confidence: number;
  reason: string;
}

/**
 * One row of the reuse-mapping registry — documents which already-built
 * service/page an intent hands off to. The orchestrator only *reads*
 * this table; it never calls resume/LinkedIn/opportunity services
 * itself.
 */
export interface CoachWorkflow {
  intent: CoachIntent;
  service: string;
  page: string;
  route: string;
  suggestedAction: string;
  ctaLabel: string;
  /** Which existing AI Router service this intent would call once real AI
   * generation is wired up — documentation today, not a live reference. */
  futureAiHook: string;
}

export interface CoachCta {
  label: string;
  href: string;
}

/** What the orchestrator returns — the only shape the UI is allowed to
 * depend on. The UI never sees `ClassifierResult` or `CoachWorkflow`
 * directly. */
export interface OrchestrationResult {
  intent: CoachIntent;
  confidence: number;
  reason: string;
  suggestedAction: string;
  cta: CoachCta;
  existingRoute: string;
  futureAiHook: string;
}

/**
 * The Context Engine's output (`features/coach/context.ts`) — every
 * existing signal the Coach needs, gathered once per request from
 * already-existing queries/services. No persistence, no database, no
 * duplicated query.
 */
export interface CoachContext {
  user: UserDTO;
  resume: {
    count: number;
    latestResumeId: string | null;
  };
  resumeAnalysis: {
    hasAnalysis: boolean;
    latestScore: number | null;
    /** Sprint 3 (Career Agent) — the full row, not just the score:
     * `buildBriefing` needs the `breakdown` JSON, and exposing it here
     * lets the dashboard stop calling `getDashboardData` a second time
     * just to get this same object. */
    latest: ResumeAnalysis | null;
  };
  linkedIn: {
    hasAnalysis: boolean;
  };
  applications: {
    total: number;
    totalInterviews: number;
    totalOffers: number;
    responseRate: number;
  };
  interview: {
    isReady: boolean;
    href: string;
  };
  jobs: {
    savedCount: number;
    /** Sprint 3 (Career Agent) — the raw rows already fetched via
     * `listOpportunitiesForUser` to compute `savedCount`/`hired.achieved`
     * above; exposed so the Career Agent's Priority Queue can reuse them
     * instead of re-querying. */
    opportunities: Opportunity[];
  };
  dashboard: {
    recentActivity: ActivityItem[];
  };
  /** Sprint 3 (Career Agent) — the user's parsed-resume profile, reused
   * by the Opportunity Intelligence Engine (`features/opportunities/intelligence.ts`)
   * for the Recommended Opportunities widget. `null` when no resume has
   * been parsed yet. */
  resumeProfile: ResumeMatchProfile | null;
  /** Whether any saved opportunity has reached `JOINED` — derived from the
   * same opportunity list already fetched for `jobs.savedCount`, no extra
   * query. Powers the Roadmap's "Hired" milestone. */
  hired: {
    achieved: boolean;
  };
  /**
   * Sprint 1.5 (Personalization) — real onboarding answers, reused as-is
   * from `DiscoveryPreference`/`CareerGoal` (the same rows the onboarding
   * wizard itself reads/writes). `null`/`[]` means the user hasn't
   * answered that question yet — never filled in with a guess.
   */
  onboarding: {
    targetRole: string | null;
    targetTimeline: string | null;
    urgency: AvailabilityWindow | null;
    dreamCompanies: string[];
    searchPriorities: SearchPriority[];
    existingJobPortals: string[];
    locationSummary: string | null;
  };
  nextStep: NextStep;
}

/** One turn of the client-held, session-only conversation history (Step
 * 5) — never persisted, never sent anywhere except back to the server as
 * context for the next message, capped at the last 10. */
export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export type CoachTone = "encouraging" | "professional" | "direct";

/**
 * Everything the Response Builder (Sprint 8's `features/ai/response-builder.ts`)
 * decides *deterministically*, alongside the AI-generated `message` text.
 * `cta` is a direct pass-through of `OrchestrationResult.cta` — the model
 * never decides it (the Orchestrator remains the source of truth).
 */
export interface CoachResponseMeta {
  cta: CoachCta;
  followUpQuestion: string | null;
  tone: CoachTone;
}

/** The full shape from Step 2 — `message` is generated (and, over HTTP,
 * streamed) separately; this is what the two pieces combine into once
 * the stream finishes. */
export interface CoachResponse extends CoachResponseMeta {
  message: string;
}
