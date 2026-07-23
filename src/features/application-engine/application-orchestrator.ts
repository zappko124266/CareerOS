import "server-only";

import { analyzeJobMatch } from "@/features/career-intelligence/jobs/job-match-analysis/service";
import type { CareerBrain } from "@/features/career-brain/types";
import type { PriorityQueueRow } from "@/features/opportunities/priority-queue";
import { getLatestParsedResume } from "@/features/resume/queries";
import { logger } from "@/lib/logger";
import type { AutomationTaskStatus } from "@/features/automation/types";

import { buildApplicationQueue, type AiReviewResult, type ApplicationQueueEntry, type ApplicationQueueStatus } from "./application-queue";
import { decideEligibility } from "./decision-engine";
import { getApplicationCandidates } from "./discovery-pipeline";
import { runApplicationExecution } from "./execution";
import { getApprovalPolicyForUser } from "./queries";
import { recordApplicationDecision } from "./tracking";

export interface ApplicationEngineSummary {
  queue: ApplicationQueueEntry[];
  readyForManualReviewCount: number;
}

const REVIEW_APPROVED_STATUSES: ApplicationQueueStatus[] = ["AI_REVIEWED", "BLOCKED_NO_CONNECTOR"];
/** Bounds how many opportunities the execution pipeline (capability
 * check → ... → apply) walks per orchestrator run — same
 * `maxPerInvocation` discipline every other automation task already
 * applies, even though today's real cost is just a few DB/API calls per
 * opportunity (capability validation always fails before any AI call is
 * reached — see `execution.ts`'s own doc comment). */
const MAX_EXECUTIONS_PER_RUN = 10;

function toAutomationStatus(status: ApplicationQueueStatus): AutomationTaskStatus {
  if (status === "AI_REVIEWED" || status === "BLOCKED_NO_CONNECTOR" || status === "SUBMITTED") return "completed";
  if (status === "FAILED") return "failed";
  return "skipped";
}

/**
 * The AI review step (Sprint 9, requirement 5) — reuses the existing,
 * already-shipped `analyzeJobMatch` Career Intelligence service (the
 * same one `getOpportunityMatchAnalysisAction` calls for the Application
 * Workspace's on-demand analysis), never a new prompt or model call.
 * Returns `null` (never a fabricated review) when the listing has no
 * description to analyze or the AI call fails.
 */
async function runAiReview(row: PriorityQueueRow, resumeText: string): Promise<AiReviewResult | null> {
  if (!row.opportunity.description.trim()) return null;

  try {
    const result = await analyzeJobMatch({
      resumeText,
      jobDescription: row.opportunity.description,
    });
    return { opportunityId: row.opportunity.id, recommendation: result.recommendation, summary: result.summary };
  } catch (error) {
    logger.error("application_engine.ai_review_failed", {
      opportunityId: row.opportunity.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * The Application Orchestrator — Sprint 9's single entry point, extended
 * (Sprint 18) rather than duplicated into a second pipeline. Discovery
 * Pipeline -> Decision Engine -> AI review (only for candidates that
 * passed tier + preferences) -> Application Queue, recording a
 * per-opportunity decision to Execution History (`tracking.ts`) along
 * the way — all unchanged from Sprint 9. New this sprint: every
 * `AI_REVIEWED`/`BLOCKED_NO_CONNECTOR` entry is now also walked through
 * `execution.ts`'s real Connector Capability Check → ... → Connector
 * Apply pipeline (bounded to `MAX_EXECUTIONS_PER_RUN`), persisting a real
 * `ApplicationExecution` row for each. `decideEligibility`'s own
 * connector check still never finds a usable connector today (see
 * `connector-capabilities.ts`), so every one of those executions
 * currently terminates at `MANUAL_REQUIRED` — this function still never
 * fabricates a submission, it just now records *why* a real, structured
 * pipeline stopped instead of stopping at the queue-building step alone.
 */
export async function runApplicationEngine(brain: CareerBrain): Promise<ApplicationEngineSummary> {
  const candidates = getApplicationCandidates(brain);
  const decisions = await Promise.all(candidates.map((row) => decideEligibility(row, brain)));
  const decisionByOpportunityId = new Map(decisions.map((decision) => [decision.opportunityId, decision]));
  const candidateByOpportunityId = new Map(candidates.map((row) => [row.opportunity.id, row]));

  const reviewableOpportunityIds = new Set(
    decisions.filter((decision) => decision.eligible || decision.blockedByConnector).map((decision) => decision.opportunityId),
  );
  const reviewable = candidates.filter((row) => reviewableOpportunityIds.has(row.opportunity.id));

  let aiReviews: AiReviewResult[] = [];
  if (reviewable.length > 0) {
    const resume = await getLatestParsedResume(brain.userId);
    if (resume?.rawText) {
      const results = await Promise.all(reviewable.map((row) => runAiReview(row, resume.rawText!)));
      aiReviews = results.filter((review): review is AiReviewResult => review !== null);
    }
  }

  const queue = buildApplicationQueue(candidates, decisions, aiReviews);

  await Promise.all(
    queue.map((entry) =>
      recordApplicationDecision({
        userId: brain.userId,
        opportunityId: entry.opportunityId,
        status: toAutomationStatus(entry.status),
        detail: entry.reasons.join(" ") || `${entry.status} — no further detail.`,
      }),
    ),
  );

  const executionCandidates = queue
    .filter((entry) => REVIEW_APPROVED_STATUSES.includes(entry.status))
    .slice(0, MAX_EXECUTIONS_PER_RUN);

  if (executionCandidates.length > 0) {
    const approvalPolicy = await getApprovalPolicyForUser(brain.userId);
    await Promise.all(
      executionCandidates.map(async (entry) => {
        const row = candidateByOpportunityId.get(entry.opportunityId);
        const decision = decisionByOpportunityId.get(entry.opportunityId);
        if (!row || !decision) return;
        try {
          await runApplicationExecution(row, decision, brain.userId, approvalPolicy);
        } catch (error) {
          logger.error("application_engine.execution_failed", {
            opportunityId: entry.opportunityId,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }

  return {
    queue,
    readyForManualReviewCount: queue.filter((entry) => REVIEW_APPROVED_STATUSES.includes(entry.status)).length,
  };
}
