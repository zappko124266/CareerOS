-- AlterTable
ALTER TABLE "discovery_preferences" ADD COLUMN     "education_level" TEXT,
ADD COLUMN     "employment_types" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skills" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "years_of_experience" INTEGER;
