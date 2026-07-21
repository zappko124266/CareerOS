-- AlterTable
ALTER TABLE "discovery_preferences" ADD COLUMN     "existing_job_portals" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "search_priorities" JSONB NOT NULL DEFAULT '[]';
