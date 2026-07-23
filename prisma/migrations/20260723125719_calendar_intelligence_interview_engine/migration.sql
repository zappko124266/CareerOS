-- AlterEnum
ALTER TYPE "MeteredFeature" ADD VALUE 'CALENDAR_SYNC';

-- CreateEnum
CREATE TYPE "InterviewMeetingStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewSource" AS ENUM ('MANUAL', 'GMAIL_DETECTED', 'CALENDAR_DETECTED');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "meeting_status" "InterviewMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "meeting_status_history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "source" "InterviewSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "meeting_link" TEXT,
ADD COLUMN     "meeting_platform" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "calendar_provider" "ConnectionProvider",
ADD COLUMN     "calendar_id" TEXT,
ADD COLUMN     "calendar_event_id" TEXT,
ADD COLUMN     "created_by_careeros" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gmail_career_event_id" UUID,
ADD COLUMN     "has_conflict" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "conflict_note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "interviews_calendar_provider_calendar_event_id_key" ON "interviews"("calendar_provider", "calendar_event_id");

-- CreateIndex
CREATE INDEX "interviews_gmail_career_event_id_idx" ON "interviews"("gmail_career_event_id");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_gmail_career_event_id_fkey" FOREIGN KEY ("gmail_career_event_id") REFERENCES "gmail_career_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
