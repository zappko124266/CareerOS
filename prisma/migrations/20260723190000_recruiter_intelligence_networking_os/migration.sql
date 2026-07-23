-- CreateEnum
CREATE TYPE "RecruiterPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('REQUESTED', 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "recruiters" ADD COLUMN     "priority" "RecruiterPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "recruiter_id" UUID,
    "company_id" UUID,
    "opportunity_id" UUID,
    "status" "ReferralStatus" NOT NULL DEFAULT 'REQUESTED',
    "status_history" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referrals_user_id_idx" ON "referrals"("user_id");

-- CreateIndex
CREATE INDEX "referrals_recruiter_id_idx" ON "referrals"("recruiter_id");

-- CreateIndex
CREATE INDEX "referrals_opportunity_id_idx" ON "referrals"("opportunity_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "recruiters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
