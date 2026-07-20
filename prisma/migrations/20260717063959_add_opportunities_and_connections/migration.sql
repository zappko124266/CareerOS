-- CreateEnum
CREATE TYPE "OpportunitySource" AS ENUM ('ADZUNA', 'JOOBLE', 'ARBEITNOW', 'REMOTEOK', 'MANUAL');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('JOB', 'INTERNSHIP', 'CONTRACT', 'FREELANCE', 'CAMPUS');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DISCOVERED', 'SAVED', 'PREPARING', 'READY_FOR_REVIEW', 'APPLIED', 'APPLICATION_VIEWED', 'RECRUITER_CONTACT', 'SHORTLISTED', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'JOINED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConnectionProvider" AS ENUM ('LINKEDIN', 'NAUKRI', 'INDEED', 'FOUNDIT', 'WELLFOUND', 'APNA', 'INTERNSHALA');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NOT_AVAILABLE', 'PENDING', 'CONNECTED', 'EXPIRED', 'ERROR');

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "OpportunitySource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL DEFAULT 'JOB',
    "title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "employment_type" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT,
    "description" TEXT NOT NULL,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "apply_url" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'SAVED',
    "status_history" JSONB NOT NULL DEFAULT '[]',
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "cover_letter" TEXT,
    "recruiter_notes" TEXT,
    "resume_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_notes" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "ConnectionProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "expires_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunities_user_id_idx" ON "opportunities"("user_id");

-- CreateIndex
CREATE INDEX "opportunities_user_id_status_idx" ON "opportunities"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_user_id_source_source_id_key" ON "opportunities"("user_id", "source", "source_id");

-- CreateIndex
CREATE INDEX "interview_notes_opportunity_id_idx" ON "interview_notes"("opportunity_id");

-- CreateIndex
CREATE INDEX "account_connections_user_id_idx" ON "account_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_connections_user_id_provider_key" ON "account_connections"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_connections" ADD CONSTRAINT "account_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
