-- CreateEnum
CREATE TYPE "SubmissionMethod" AS ENUM ('COMPANY_CAREER_PAGE_MANUAL', 'EMAIL_MANUAL', 'USER_APPROVED_BROWSER_MANUAL', 'OFFICIAL_API');

-- CreateEnum
CREATE TYPE "SubmissionResult" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "FollowUpRecommendationType" AS ENUM ('FOLLOW_UP_NOW', 'WAIT', 'SEND_REMINDER', 'UPDATE_RESUME', 'WITHDRAW', 'APPLY_ELSEWHERE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationDocumentAudience" ADD VALUE 'STARTUP';
ALTER TYPE "ApplicationDocumentAudience" ADD VALUE 'ENTERPRISE';
ALTER TYPE "ApplicationDocumentAudience" ADD VALUE 'REMOTE';
ALTER TYPE "ApplicationDocumentAudience" ADD VALUE 'GOVERNMENT';
ALTER TYPE "ApplicationDocumentAudience" ADD VALUE 'COMPANY';

-- AlterEnum
ALTER TYPE "ApplicationDocumentSubtype" ADD VALUE 'APPLICATION_REMINDER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeteredFeature" ADD VALUE 'APPLICATION_STRATEGY';
ALTER TYPE "MeteredFeature" ADD VALUE 'FOLLOW_UP_RECOMMENDATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunityStatus" ADD VALUE 'READY';
ALTER TYPE "OpportunityStatus" ADD VALUE 'AWAITING_APPROVAL';
ALTER TYPE "OpportunityStatus" ADD VALUE 'ASSESSMENT';
ALTER TYPE "OpportunityStatus" ADD VALUE 'DECLINED';
ALTER TYPE "OpportunityStatus" ADD VALUE 'REJECTED';
ALTER TYPE "OpportunityStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "custom_questions" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "application_submissions" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "method" "SubmissionMethod" NOT NULL,
    "result" "SubmissionResult" NOT NULL DEFAULT 'PENDING',
    "connector_source" "OpportunitySource" NOT NULL,
    "resume_id" UUID,
    "resume_version_id" UUID,
    "cover_letter_document_id" UUID,
    "recruiter_message_document_id" UUID,
    "email_document_id" UUID,
    "submitted_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failure_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_strategies" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "best_resume_id" UUID,
    "needs_tailoring" BOOLEAN NOT NULL,
    "needs_ats_optimization" BOOLEAN NOT NULL,
    "needs_cover_letter" BOOLEAN NOT NULL,
    "needs_recruiter_message" BOOLEAN NOT NULL,
    "needs_portfolio" BOOLEAN NOT NULL,
    "needs_certifications" BOOLEAN NOT NULL,
    "needs_linkedin_update" BOOLEAN NOT NULL,
    "needs_resume_rewrite" BOOLEAN NOT NULL,
    "needs_skill_improvement" BOOLEAN NOT NULL,
    "confidence" INTEGER NOT NULL,
    "reasoning" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_recommendations" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "recommendation_type" "FollowUpRecommendationType" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_overrides" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "feature" "MeteredFeature" NOT NULL,
    "custom_limit" INTEGER,
    "reason" TEXT NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_submissions_opportunity_id_idx" ON "application_submissions"("opportunity_id");

-- CreateIndex
CREATE INDEX "application_strategies_opportunity_id_idx" ON "application_strategies"("opportunity_id");

-- CreateIndex
CREATE INDEX "follow_up_recommendations_opportunity_id_idx" ON "follow_up_recommendations"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_overrides_user_id_feature_key" ON "entitlement_overrides"("user_id", "feature");

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_cover_letter_document_id_fkey" FOREIGN KEY ("cover_letter_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_recruiter_message_document_id_fkey" FOREIGN KEY ("recruiter_message_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_submissions" ADD CONSTRAINT "application_submissions_email_document_id_fkey" FOREIGN KEY ("email_document_id") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_strategies" ADD CONSTRAINT "application_strategies_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_strategies" ADD CONSTRAINT "application_strategies_best_resume_id_fkey" FOREIGN KEY ("best_resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_recommendations" ADD CONSTRAINT "follow_up_recommendations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement_overrides" ADD CONSTRAINT "entitlement_overrides_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
