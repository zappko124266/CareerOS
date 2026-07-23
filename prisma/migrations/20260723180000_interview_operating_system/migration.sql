-- CreateEnum
CREATE TYPE "InterviewDocumentType" AS ENUM ('ASSIGNMENT', 'CASE_STUDY', 'OFFER_LETTER', 'FEEDBACK', 'JOINING_DOCUMENT');

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "feedback_analysis" JSONB;

-- AlterTable
ALTER TABLE "interview_notes" ADD COLUMN     "document_type" "InterviewDocumentType",
ADD COLUMN     "document_url" TEXT;
