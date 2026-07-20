-- AlterEnum
ALTER TYPE "ApplicationDocumentSubtype" ADD VALUE 'THANK_YOU_MESSAGE';

-- AlterEnum
ALTER TYPE "MeteredFeature" ADD VALUE 'LINKEDIN_ANALYSIS';

-- CreateTable
CREATE TABLE "linkedin_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_text" TEXT NOT NULL,
    "headline" TEXT,
    "target_role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_profile_versions" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_profile_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linkedin_analyses" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "seo_score" INTEGER NOT NULL,
    "recruiter_visibility_score" INTEGER NOT NULL,
    "keyword_coverage" JSONB NOT NULL,
    "missing_keywords" JSONB NOT NULL,
    "missing_sections" JSONB NOT NULL,
    "headline_suggestions" JSONB NOT NULL,
    "about_suggestions" JSONB NOT NULL,
    "experience_improvements" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linkedin_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linkedin_profiles_user_id_key" ON "linkedin_profiles"("user_id");

-- CreateIndex
CREATE INDEX "linkedin_profile_versions_profile_id_idx" ON "linkedin_profile_versions"("profile_id");

-- CreateIndex
CREATE INDEX "linkedin_analyses_profile_id_created_at_idx" ON "linkedin_analyses"("profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "linkedin_profiles" ADD CONSTRAINT "linkedin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linkedin_profile_versions" ADD CONSTRAINT "linkedin_profile_versions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "linkedin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linkedin_analyses" ADD CONSTRAINT "linkedin_analyses_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "linkedin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
