-- AlterTable
ALTER TABLE "RecommendationSettings" ADD COLUMN     "includeDropped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeWant" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "includeWatched" BOOLEAN NOT NULL DEFAULT true;
