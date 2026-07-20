-- CreateEnum
CREATE TYPE "ApplicationDocumentKind" AS ENUM ('COVER_LETTER', 'EMAIL', 'RECRUITER_MESSAGE');

-- CreateEnum
CREATE TYPE "ApplicationDocumentSubtype" AS ENUM ('APPLICATION_EMAIL', 'RECRUITER_EMAIL', 'HIRING_MANAGER_EMAIL', 'COLD_OUTREACH', 'REFERRAL_REQUEST', 'FOLLOW_UP', 'INTERVIEW_CONFIRMATION', 'INTERVIEW_REMINDER', 'INTERVIEW_THANK_YOU', 'SALARY_NEGOTIATION', 'OFFER_ACCEPTANCE', 'OFFER_DECLINE', 'LINKEDIN_MESSAGE', 'NETWORKING_MESSAGE', 'TALENT_COMMUNITY_MESSAGE');

-- CreateEnum
CREATE TYPE "ApplicationDocumentAudience" AS ENUM ('HIRING_MANAGER', 'RECRUITER', 'REFERRAL', 'FRESHER', 'EXPERIENCED', 'INTERNSHIP', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ApplicationDocumentTone" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'EXECUTIVE', 'TECHNICAL', 'CREATIVE');

-- CreateEnum
CREATE TYPE "ApplicationDocumentLength" AS ENUM ('SHORT', 'MEDIUM', 'LONG');

-- CreateEnum
CREATE TYPE "ApplicationDocumentStatus" AS ENUM ('DRAFT', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeteredFeature" ADD VALUE 'APPLICATION_DOCUMENT_GENERATION';
ALTER TYPE "MeteredFeature" ADD VALUE 'APPLICATION_REVIEW';
ALTER TYPE "MeteredFeature" ADD VALUE 'APPLICATION_EXPORT';
ALTER TYPE "MeteredFeature" ADD VALUE 'COMPANY_SNAPSHOT';

-- CreateTable
CREATE TABLE "application_documents" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "kind" "ApplicationDocumentKind" NOT NULL,
    "subtype" "ApplicationDocumentSubtype",
    "audience" "ApplicationDocumentAudience",
    "tone" "ApplicationDocumentTone",
    "length" "ApplicationDocumentLength",
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ApplicationDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "ai_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_reviews" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "readiness_score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "missing_keywords" JSONB NOT NULL,
    "missing_skills" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "recruiter_perspective" TEXT NOT NULL,
    "ats_perspective" TEXT NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_snapshots" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "ai_summary" TEXT NOT NULL,
    "ai_highlights" JSONB NOT NULL,
    "ai_caveats" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_documents_opportunity_id_idx" ON "application_documents"("opportunity_id");

-- CreateIndex
CREATE INDEX "application_documents_opportunity_id_kind_idx" ON "application_documents"("opportunity_id", "kind");

-- CreateIndex
CREATE INDEX "application_document_versions_document_id_idx" ON "application_document_versions"("document_id");

-- CreateIndex
CREATE INDEX "application_reviews_opportunity_id_idx" ON "application_reviews"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_snapshots_opportunity_id_key" ON "company_snapshots"("opportunity_id");

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_document_versions" ADD CONSTRAINT "application_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "application_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_snapshots" ADD CONSTRAINT "company_snapshots_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
