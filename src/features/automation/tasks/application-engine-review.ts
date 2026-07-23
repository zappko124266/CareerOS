import { runApplicationEngine } from "@/features/application-engine/application-orchestrator";
import { APPLICATION_CANDIDATE_STATUSES } from "@/features/application-engine/discovery-pipeline";
import { getCareerBrain } from "@/features/career-brain/brain";
import { toUserDTO } from "@/lib/auth/dto";
import { prisma } from "@/lib/prisma";

import { exponentialBackoff } from "../policies";
import { AUTOMATION_TASK_LABEL } from "../types";
import type { AutomationTaskDefinition } from "../types";

/** Users with at least one saved, un-applied opportunity — the only new
 * query this task introduces, bounded the same way `listUsersDueForDiscovery`/
 * `listOpportunitiesDueForFollowUp` already are. */
async function listUsersWithApplicationCandidates(_now: Date, limit: number): Promise<string[]> {
  const rows = await prisma.opportunity.groupBy({
    by: ["userId"],
    where: { status: { in: APPLICATION_CANDIDATE_STATUSES } },
    orderBy: { userId: "asc" },
    take: limit,
  });
  return rows.map((row) => row.userId);
}

/**
 * Wraps the Application Engine (`features/application-engine/`) as an
 * Automation Task Registry entry — Sprint 9, requirement 7. `execute`
 * reuses `getCareerBrain` (Sprint 4, the one query root) and
 * `runApplicationEngine` (Sprint 9's own orchestrator); it never calls
 * `connector.apply()` itself — that decision lives entirely inside the
 * Decision Engine, which today never finds a usable connector (see
 * `connector-capabilities.ts`). This task's real, current job is running
 * AI review at scale and recording the result to Execution History; it
 * becomes an actual submission pipeline automatically once a real
 * Easy-Apply connector is registered, with no change to this file.
 *
 * Unlike interactive request handlers, a scheduled task has no session
 * cookies to read — `getCurrentUser` (`lib/auth/dal.ts`) doesn't apply
 * here. `execute` looks the user's `Profile` up directly by the id
 * `listDue` already produced.
 */
export const applicationEngineReviewTask: AutomationTaskDefinition<string> = {
  id: "application_engine_review",
  label: AUTOMATION_TASK_LABEL.application_engine_review,
  description:
    "Reviews saved opportunities against your resume and preferences, AI-vets the strongest matches, and (once a connector supports it) submits eligible applications automatically.",
  priority: "low",
  requirements: ["A parsed resume", "At least one saved, un-applied opportunity"],
  retryPolicy: { maxAttempts: 2, backoffMs: exponentialBackoff(2000) },
  maxPerInvocation: 5,

  listDue: (now, limit) => listUsersWithApplicationCandidates(now, limit),

  // No entitlement to check — `analyzeJobMatch` (the AI review step) has
  // no metered-feature gate anywhere else it's called either.
  checkEligibility: async () => ({ allowed: true }),

  execute: async (userId) => {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      return { status: "failed", detail: "User profile no longer exists." };
    }

    const brain = await getCareerBrain(toUserDTO(profile));
    const summary = await runApplicationEngine(brain);

    return {
      status: "completed",
      detail: `${summary.readyForManualReviewCount} of ${summary.queue.length} candidate(s) passed AI review.`,
      metadata: { queueLength: summary.queue.length, readyForManualReviewCount: summary.readyForManualReviewCount },
    };
  },

  // Nothing to consume — this task calls no metered feature of its own.
  onSuccess: async () => {},

  getUserId: (userId) => userId,
  getSubjectId: (userId) => userId,
};
