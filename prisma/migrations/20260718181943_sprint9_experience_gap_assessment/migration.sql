-- CreateTable
CREATE TABLE "experience_gap_assessments" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "gaps" JSONB NOT NULL,
    "overall_readiness" INTEGER NOT NULL,
    "mitigation_suggestions" JSONB NOT NULL,
    "ai_model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_gap_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experience_gap_assessments_opportunity_id_created_at_idx" ON "experience_gap_assessments"("opportunity_id", "created_at");

-- AddForeignKey
ALTER TABLE "experience_gap_assessments" ADD CONSTRAINT "experience_gap_assessments_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
