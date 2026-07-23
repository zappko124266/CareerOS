-- AlterTable
ALTER TABLE "resume_versions" ADD COLUMN     "target_company_name" TEXT,
ADD COLUMN     "target_opportunity_id" UUID;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_target_opportunity_id_fkey" FOREIGN KEY ("target_opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
