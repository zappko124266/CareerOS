-- CreateEnum
CREATE TYPE "DiscoveryFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "AvailabilityWindow" AS ENUM ('IMMEDIATE', 'TWO_WEEKS', 'ONE_MONTH', 'FLEXIBLE', 'NOT_LOOKING');

-- CreateEnum
CREATE TYPE "DiscoveryTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "DiscoveryDisposition" AS ENUM ('NEW', 'SAVED', 'HIDDEN', 'REJECTED');

-- AlterEnum
ALTER TYPE "MeteredFeature" ADD VALUE 'JOB_DISCOVERY_RUN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunitySource" ADD VALUE 'GREENHOUSE';
ALTER TYPE "OpportunitySource" ADD VALUE 'LEVER';
ALTER TYPE "OpportunitySource" ADD VALUE 'USAJOBS';
ALTER TYPE "OpportunitySource" ADD VALUE 'REED';

-- CreateTable
CREATE TABLE "discovery_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "preferred_roles" JSONB NOT NULL DEFAULT '[]',
    "preferred_companies" JSONB NOT NULL DEFAULT '[]',
    "company_blacklist" JSONB NOT NULL DEFAULT '[]',
    "company_whitelist" JSONB NOT NULL DEFAULT '[]',
    "industries" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "hybrid" BOOLEAN NOT NULL DEFAULT true,
    "onsite" BOOLEAN NOT NULL DEFAULT true,
    "countries" JSONB NOT NULL DEFAULT '[]',
    "states" JSONB NOT NULL DEFAULT '[]',
    "cities" JSONB NOT NULL DEFAULT '[]',
    "radius_km" INTEGER,
    "open_to_relocation" BOOLEAN NOT NULL DEFAULT false,
    "open_to_international_relocation" BOOLEAN NOT NULL DEFAULT false,
    "experience_level" "ExperienceLevel",
    "availability" "AvailabilityWindow",
    "discovery_frequency" "DiscoveryFrequency" NOT NULL DEFAULT 'DAILY',
    "notify_in_app" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "connector_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "favorited" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "jobs_found" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "triggered_by" "DiscoveryTrigger" NOT NULL,
    "connectors_used" JSONB NOT NULL DEFAULT '[]',
    "jobs_found" INTEGER NOT NULL DEFAULT 0,
    "new_jobs_found" INTEGER NOT NULL DEFAULT 0,
    "companies_found" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_listings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" "OpportunitySource" NOT NULL,
    "source_id" TEXT NOT NULL,
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
    "posted_at" TIMESTAMP(3),
    "disposition" "DiscoveryDisposition" NOT NULL DEFAULT 'NEW',
    "match_score" INTEGER,
    "match_factors" JSONB,
    "discovery_run_id" UUID,
    "saved_opportunity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_companies" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "open_roles" INTEGER NOT NULL DEFAULT 0,
    "match_score" INTEGER,
    "match_factors" JSONB,
    "eligibility_notes" JSONB NOT NULL DEFAULT '[]',
    "disposition" "DiscoveryDisposition" NOT NULL DEFAULT 'NEW',
    "discovery_run_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discovery_preferences_user_id_key" ON "discovery_preferences"("user_id");

-- CreateIndex
CREATE INDEX "connector_preferences_user_id_idx" ON "connector_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "connector_preferences_user_id_connector_id_key" ON "connector_preferences"("user_id", "connector_id");

-- CreateIndex
CREATE INDEX "discovery_runs_user_id_started_at_idx" ON "discovery_runs"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_listings_saved_opportunity_id_key" ON "discovered_listings"("saved_opportunity_id");

-- CreateIndex
CREATE INDEX "discovered_listings_user_id_disposition_idx" ON "discovered_listings"("user_id", "disposition");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_listings_user_id_source_source_id_key" ON "discovered_listings"("user_id", "source", "source_id");

-- CreateIndex
CREATE INDEX "discovered_companies_user_id_disposition_idx" ON "discovered_companies"("user_id", "disposition");

-- CreateIndex
CREATE UNIQUE INDEX "discovered_companies_user_id_company_name_key" ON "discovered_companies"("user_id", "company_name");

-- AddForeignKey
ALTER TABLE "discovery_preferences" ADD CONSTRAINT "discovery_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connector_preferences" ADD CONSTRAINT "connector_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_runs" ADD CONSTRAINT "discovery_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_listings" ADD CONSTRAINT "discovered_listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_listings" ADD CONSTRAINT "discovered_listings_discovery_run_id_fkey" FOREIGN KEY ("discovery_run_id") REFERENCES "discovery_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_listings" ADD CONSTRAINT "discovered_listings_saved_opportunity_id_fkey" FOREIGN KEY ("saved_opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_companies" ADD CONSTRAINT "discovered_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovered_companies" ADD CONSTRAINT "discovered_companies_discovery_run_id_fkey" FOREIGN KEY ("discovery_run_id") REFERENCES "discovery_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
