-- AlterTable
ALTER TABLE "linkedin_analyses" ALTER COLUMN "seo_score" DROP NOT NULL,
ALTER COLUMN "recruiter_visibility_score" DROP NOT NULL,
ALTER COLUMN "keyword_coverage" SET DEFAULT '[]',
ALTER COLUMN "missing_keywords" SET DEFAULT '[]',
ALTER COLUMN "headline_suggestions" SET DEFAULT '[]',
ALTER COLUMN "about_suggestions" DROP NOT NULL,
ALTER COLUMN "experience_improvements" SET DEFAULT '[]';
