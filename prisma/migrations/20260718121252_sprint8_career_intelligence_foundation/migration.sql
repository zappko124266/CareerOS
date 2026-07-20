-- CreateEnum
CREATE TYPE "RecruiterInteractionType" AS ENUM ('VIEWED_PROFILE', 'CONTACTED', 'REPLIED', 'INTERVIEW_REQUESTED', 'REJECTED', 'GHOSTED', 'HIRED');

-- CreateEnum
CREATE TYPE "InterviewStage" AS ENUM ('APPLIED', 'SCREENING', 'TECHNICAL', 'MANAGER', 'HR', 'FINAL', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LearningItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeteredFeature" ADD VALUE 'INTERVIEW_PREP';
ALTER TYPE "MeteredFeature" ADD VALUE 'COMPANY_RESEARCH';
ALTER TYPE "MeteredFeature" ADD VALUE 'SALARY_ESTIMATE';
ALTER TYPE "MeteredFeature" ADD VALUE 'CAREER_HEALTH_SCORE';
ALTER TYPE "MeteredFeature" ADD VALUE 'OFFER_COMPARISON';

-- AlterTable
ALTER TABLE "interview_notes" ADD COLUMN     "interview_id" UUID;

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "company_id" UUID;

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "industry" TEXT,
    "business_category" TEXT,
    "size_estimate" TEXT,
    "ai_summary" TEXT,
    "ai_highlights" JSONB NOT NULL DEFAULT '[]',
    "ai_caveats" JSONB NOT NULL DEFAULT '[]',
    "ai_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiters" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" UUID,
    "title" TEXT,
    "linkedin_url" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_interactions" (
    "id" UUID NOT NULL,
    "recruiter_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "type" "RecruiterInteractionType" NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "recruiter_id" UUID,
    "stage" "InterviewStage" NOT NULL DEFAULT 'APPLIED',
    "stage_history" JSONB NOT NULL DEFAULT '[]',
    "scheduled_at" TIMESTAMP(3),
    "round_label" TEXT,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_preps" (
    "id" UUID NOT NULL,
    "interview_id" UUID NOT NULL,
    "likely_questions" JSONB NOT NULL,
    "star_answer_suggestions" JSONB NOT NULL,
    "weak_answer_flags" JSONB NOT NULL DEFAULT '[]',
    "improvement_suggestions" JSONB NOT NULL,
    "confidence_score" INTEGER NOT NULL,
    "preparation_checklist" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_preps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "base_salary" INTEGER,
    "bonus" INTEGER,
    "equity_details" TEXT,
    "currency" TEXT,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "start_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_role" TEXT,
    "target_companies" JSONB NOT NULL DEFAULT '[]',
    "target_salary_min" INTEGER,
    "target_salary_max" INTEGER,
    "target_location" TEXT,
    "target_timeline" TEXT,
    "remote_preference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "skill_or_topic" TEXT NOT NULL,
    "status" "LearningItemStatus" NOT NULL DEFAULT 'PLANNED',
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_estimates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "years_of_experience" INTEGER NOT NULL,
    "estimated_min" INTEGER NOT NULL,
    "estimated_max" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "percentile" TEXT NOT NULL,
    "market_comparison" TEXT NOT NULL,
    "cost_of_living_adjustment" TEXT NOT NULL,
    "growth_projection" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "negotiation_tips" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_health_scores" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "interview_readiness" INTEGER,
    "resume_quality" INTEGER,
    "linkedin_quality" INTEGER,
    "skill_readiness" INTEGER,
    "market_readiness" INTEGER,
    "company_readiness" INTEGER,
    "growth_readiness" INTEGER,
    "factors_explanation" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_normalized_name_key" ON "companies"("normalized_name");

-- CreateIndex
CREATE INDEX "recruiters_user_id_idx" ON "recruiters"("user_id");

-- CreateIndex
CREATE INDEX "recruiter_interactions_recruiter_id_idx" ON "recruiter_interactions"("recruiter_id");

-- CreateIndex
CREATE INDEX "recruiter_interactions_opportunity_id_idx" ON "recruiter_interactions"("opportunity_id");

-- CreateIndex
CREATE INDEX "interviews_opportunity_id_idx" ON "interviews"("opportunity_id");

-- CreateIndex
CREATE INDEX "interview_preps_interview_id_idx" ON "interview_preps"("interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_opportunity_id_key" ON "offers"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "career_goals_user_id_key" ON "career_goals"("user_id");

-- CreateIndex
CREATE INDEX "learning_items_user_id_idx" ON "learning_items"("user_id");

-- CreateIndex
CREATE INDEX "salary_estimates_user_id_idx" ON "salary_estimates"("user_id");

-- CreateIndex
CREATE INDEX "career_health_scores_user_id_idx" ON "career_health_scores"("user_id");

-- CreateIndex
CREATE INDEX "interview_notes_interview_id_idx" ON "interview_notes"("interview_id");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiters" ADD CONSTRAINT "recruiters_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_interactions" ADD CONSTRAINT "recruiter_interactions_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_interactions" ADD CONSTRAINT "recruiter_interactions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_preps" ADD CONSTRAINT "interview_preps_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_estimates" ADD CONSTRAINT "salary_estimates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_health_scores" ADD CONSTRAINT "career_health_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
