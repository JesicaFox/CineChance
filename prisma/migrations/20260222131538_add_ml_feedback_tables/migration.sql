-- CreateTable
CREATE TABLE "RecommendationDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "genreScore" DOUBLE PRECISION NOT NULL,
    "personScore" DOUBLE PRECISION NOT NULL,
    "tasteScore" DOUBLE PRECISION NOT NULL,
    "wantSignalScore" DOUBLE PRECISION NOT NULL,
    "genreFactors" JSONB,
    "personFactors" JSONB,
    "dropRiskFactors" JSONB,
    "filtersApplied" JSONB,
    "rejections" JSONB,
    "sourceType" TEXT NOT NULL,
    "similarUserId" TEXT,
    "recommendationListId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionOutcome" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "userAction" TEXT,
    "rating" INTEGER,
    "statusAfter" TEXT,
    "wasSuccessful" BOOLEAN,
    "confidenceMatch" DOUBLE PRECISION,
    "recommendedAt" TIMESTAMP(3) NOT NULL,
    "actionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelCorrection" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tmdbId" INTEGER,
    "mediaType" TEXT,
    "correctionType" TEXT NOT NULL,
    "targetFactor" TEXT,
    "targetValue" TEXT,
    "correctionValue" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelTraining" (
    "id" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "trainingDataSize" INTEGER NOT NULL,
    "trainingDateRange" JSONB,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "deprecatedAt" TIMESTAMP(3),

    CONSTRAINT "ModelTraining_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationDecision_userId_createdAt_idx" ON "RecommendationDecision"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationDecision_finalScore_idx" ON "RecommendationDecision"("finalScore");

-- CreateIndex
CREATE INDEX "PredictionOutcome_decisionId_idx" ON "PredictionOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "PredictionOutcome_userAction_idx" ON "PredictionOutcome"("userAction");

-- CreateIndex
CREATE INDEX "PredictionOutcome_wasSuccessful_idx" ON "PredictionOutcome"("wasSuccessful");

-- CreateIndex
CREATE INDEX "ModelCorrection_userId_idx" ON "ModelCorrection"("userId");

-- CreateIndex
CREATE INDEX "ModelCorrection_correctionType_idx" ON "ModelCorrection"("correctionType");

-- CreateIndex
CREATE INDEX "ModelTraining_modelVersion_idx" ON "ModelTraining"("modelVersion");

-- CreateIndex
CREATE INDEX "ModelTraining_status_idx" ON "ModelTraining"("status");

-- AddForeignKey
ALTER TABLE "RecommendationDecision" ADD CONSTRAINT "RecommendationDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionOutcome" ADD CONSTRAINT "PredictionOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "RecommendationDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCorrection" ADD CONSTRAINT "ModelCorrection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelCorrection" ADD CONSTRAINT "ModelCorrection_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
