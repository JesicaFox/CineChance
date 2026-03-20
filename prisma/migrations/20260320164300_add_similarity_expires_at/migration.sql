-- AlterTable
ALTER TABLE "SimilarityScore" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SimilarityScore_expiresAt_idx" ON "SimilarityScore"("expiresAt");
