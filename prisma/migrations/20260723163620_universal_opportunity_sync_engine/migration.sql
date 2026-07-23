-- CreateEnum
CREATE TYPE "OpportunitySyncStatus" AS ENUM ('NEW', 'UPDATED', 'UNCHANGED', 'CLOSED');

-- AlterTable
ALTER TABLE "discovered_listings" ADD COLUMN     "sync_status" "OpportunitySyncStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "content_fingerprint" TEXT;

-- AlterTable
ALTER TABLE "discovery_runs" ADD COLUMN     "updated_jobs_found" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "closed_jobs_found" INTEGER NOT NULL DEFAULT 0;
