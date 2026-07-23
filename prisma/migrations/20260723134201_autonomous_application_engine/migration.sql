-- CreateEnum
CREATE TYPE "ApplicationExecutionStatus" AS ENUM ('STARTED', 'VALIDATED', 'WAITING_APPROVAL', 'APPROVED', 'SUBMITTED', 'FAILED', 'RETRYING', 'COMPLETED', 'BLOCKED', 'MANUAL_REQUIRED');

-- CreateEnum
CREATE TYPE "ApprovalPolicy" AS ENUM ('ALWAYS_ASK', 'ASK_HIGH_PRIORITY', 'AUTO_APPLY_LOW_RISK', 'NEVER_AUTO_APPLY');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "application_approval_policy" "ApprovalPolicy" NOT NULL DEFAULT 'ALWAYS_ASK';

-- CreateTable
CREATE TABLE "application_executions" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "status" "ApplicationExecutionStatus" NOT NULL DEFAULT 'STARTED',
    "status_history" JSONB NOT NULL DEFAULT '[]',
    "connector_id" TEXT,
    "connector_provider" "ConnectionProvider",
    "resume_version_id" UUID,
    "cover_letter_document_id" UUID,
    "approval_policy_snapshot" "ApprovalPolicy" NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "questionnaire_answers" JSONB NOT NULL DEFAULT '[]',
    "application_submission_id" UUID,
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "execution_reason" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_executions_opportunity_id_key" ON "application_executions"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_executions_application_submission_id_key" ON "application_executions"("application_submission_id");

-- CreateIndex
CREATE INDEX "application_executions_status_idx" ON "application_executions"("status");

-- AddForeignKey
ALTER TABLE "application_executions" ADD CONSTRAINT "application_executions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_executions" ADD CONSTRAINT "application_executions_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_executions" ADD CONSTRAINT "application_executions_cover_letter_document_id_fkey" FOREIGN KEY ("cover_letter_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_executions" ADD CONSTRAINT "application_executions_application_submission_id_fkey" FOREIGN KEY ("application_submission_id") REFERENCES "application_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
