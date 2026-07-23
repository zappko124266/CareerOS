-- AlterEnum
ALTER TYPE "MeteredFeature" ADD VALUE 'GMAIL_SYNC';

-- CreateEnum
CREATE TYPE "GmailCareerClassification" AS ENUM ('INTERVIEW', 'RECRUITER', 'ASSESSMENT', 'APPLICATION_CONFIRMATION', 'OFFER', 'REJECTION', 'FOLLOW_UP', 'GENERAL_CAREER', 'UNKNOWN');

-- CreateTable
CREATE TABLE "gmail_career_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "gmail_message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "classification" "GmailCareerClassification" NOT NULL,
    "classified_by_rule" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "location" TEXT,
    "interview_at" TIMESTAMP(3),
    "interview_date_text" TEXT,
    "recruiter_name" TEXT,
    "recruiter_email" TEXT,
    "assessment_link" TEXT,
    "offer_amount_text" TEXT,
    "application_id" TEXT,
    "source" TEXT,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "from_email" TEXT,
    "from_name" TEXT,
    "is_unread" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gmail_career_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gmail_career_events_user_id_received_at_idx" ON "gmail_career_events"("user_id", "received_at");

-- CreateIndex
CREATE INDEX "gmail_career_events_user_id_classification_idx" ON "gmail_career_events"("user_id", "classification");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_career_events_user_id_gmail_message_id_key" ON "gmail_career_events"("user_id", "gmail_message_id");

-- AddForeignKey
ALTER TABLE "gmail_career_events" ADD CONSTRAINT "gmail_career_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
