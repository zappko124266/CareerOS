-- AlterTable
ALTER TABLE "discovered_listings" ADD COLUMN     "duplicate_of_id" UUID,
ADD COLUMN     "fingerprint" TEXT;

-- AlterTable
ALTER TABLE "discovery_preferences" ADD COLUMN     "joining_timeline" TEXT,
ADD COLUMN     "languages" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "preferred_company_size" TEXT,
ADD COLUMN     "shift_preference" TEXT,
ADD COLUMN     "travel_willingness" TEXT,
ADD COLUMN     "visa_sponsorship_required" BOOLEAN;

-- CreateIndex
CREATE INDEX "discovered_listings_user_id_fingerprint_idx" ON "discovered_listings"("user_id", "fingerprint");

-- AddForeignKey
ALTER TABLE "discovered_listings" ADD CONSTRAINT "discovered_listings_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "discovered_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
