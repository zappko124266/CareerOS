-- AlterTable
ALTER TABLE "linkedin_analyses" ADD COLUMN     "failed_slices" JSONB NOT NULL DEFAULT '[]';
