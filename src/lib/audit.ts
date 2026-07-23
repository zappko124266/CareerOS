import "server-only";
import { headers } from "next/headers";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AuditAction =
  | "auth.sign_up"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.password_reset_requested"
  | "auth.password_updated"
  | "resume.version_created"
  | "resume.version_restored"
  | "resume.tailoring_generated"
  | "resume.exported"
  | "application_document.generated"
  | "application_document.revised"
  | "application_document.version_created"
  | "application_document.version_restored"
  | "application_document.duplicated"
  | "application_document.archived"
  | "application_document.deleted"
  | "application_document.exported"
  | "application_review.generated"
  | "company_snapshot.generated"
  | "discovery.preferences_updated"
  | "discovery.connector_preference_updated"
  | "discovery.run_started"
  | "discovery.run_completed"
  | "discovery.run_failed"
  | "discovery.listing_disposition_changed"
  | "discovery.company_disposition_changed"
  | "application_strategy.generated"
  | "follow_up.recommendation_generated"
  | "application_submission.recorded"
  | "application_submission.failed"
  | "opportunity.status_changed"
  | "entitlement_override.set"
  | "entitlement_override.removed"
  | "analytics_insights.generated"
  | "company.research_generated"
  | "recruiter.created"
  | "recruiter.updated"
  | "recruiter.deleted"
  | "recruiter_interaction.logged"
  | "recruiter_interaction.deleted"
  | "referral.created"
  | "referral.status_changed"
  | "referral.deleted"
  | "interview.created"
  | "interview.stage_changed"
  | "interview.feedback_updated"
  | "interview_prep.generated"
  | "interview_answer_feedback.generated"
  | "interview_feedback.analyzed"
  | "offer.created"
  | "offer.updated"
  | "offer.deleted"
  | "offer_comparison.generated"
  | "career_goal.updated"
  | "learning_item.created"
  | "learning_item.updated"
  | "learning_item.deleted"
  | "salary_estimate.generated"
  | "career_health_score.generated"
  | "career_gap_assessment.generated"
  | "linkedin_profile.updated"
  | "linkedin_analysis.generated"
  | "linkedin_profile.version_created"
  | "linkedin_profile.version_restored"
  | "onboarding.completed"
  | "profile.updated"
  | "connector.connected"
  | "connector.disconnected"
  | "application_execution.approved"
  | "application_execution.declined"
  | "application_approval_policy.updated"
  | "discovery.listing_changed"
  | "discovery.listing_closed"
  | "automation.task_completed"
  | "automation.task_failed"
  | "automation.task_skipped";

/**
 * Appends a row to `audit_logs`. Call this from Server Actions and Route
 * Handlers after auth or other security-relevant events — never from a
 * Client Component. See `docs/ARCHITECTURE.md#auditing`.
 *
 * Deliberately never throws: auditing is a side effect, not part of the
 * operation it's recording. If the write fails (e.g. a missing/misconfigured
 * table, a transient DB error), the failure is logged so it's visible in
 * monitoring, but callers like sign-up/sign-in must still complete
 * successfully for the user.
 */
export async function logAuditEvent(
  action: AuditAction,
  options: { userId?: string | null; metadata?: Prisma.InputJsonValue } = {},
) {
  try {
    const headerList = await headers();

    await prisma.auditLog.create({
      data: {
        userId: options.userId ?? null,
        action,
        metadata: options.metadata,
        ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: headerList.get("user-agent") ?? undefined,
      },
    });
  } catch (error) {
    logger.error("audit.write_failed", {
      action,
      userId: options.userId ?? undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
