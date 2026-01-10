-- AlterTable
ALTER TABLE "RatingHistory" ADD COLUMN     "previousRating" DOUBLE PRECISION,
ADD COLUMN     "ratingChange" DOUBLE PRECISION,
ADD COLUMN     "ratingSource" TEXT,
ADD COLUMN     "recommendationLogId" TEXT;

-- AlterTable
ALTER TABLE "RecommendationLog" ADD COLUMN     "candidatePoolMetrics" JSONB,
ADD COLUMN     "filtersSnapshot" JSONB,
ADD COLUMN     "mlFeatures" JSONB,
ADD COLUMN     "temporalContext" JSONB;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "isPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recommendationWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mlProfileVersion" TEXT,
ADD COLUMN     "preferencesSnapshot" JSONB,
ADD COLUMN     "recommendationStats" JSONB;

-- AlterTable
ALTER TABLE "WatchList" ADD COLUMN     "acceptanceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hiddenFromRecommendations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenReason" TEXT,
ADD COLUMN     "lastRecommendedAt" TIMESTAMP(3),
ADD COLUMN     "recommendationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentLogId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "sessionState" JSONB,
    "timingMs" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceContext" JSONB,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "initialState" JSONB NOT NULL,
    "finalState" JSONB,
    "changesHistory" JSONB,
    "resultMetrics" JSONB,
    "abandonedFilters" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FilterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entryPoint" TEXT,
    "exitPoint" TEXT,
    "deviceContext" JSONB,
    "sessionFlow" JSONB,
    "outcome" TEXT,
    "outcomeMetrics" JSONB,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntentSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationLogId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "intensityScore" DOUBLE PRECISION NOT NULL,
    "elementContext" JSONB,
    "temporalContext" JSONB,
    "userAgentContext" JSONB,
    "predictedIntent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegativeFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationLogId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "detailedReason" TEXT,
    "isExplicit" BOOLEAN NOT NULL DEFAULT false,
    "contextualFactors" JSONB,
    "correctiveAction" JSONB,
    "severity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegativeFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlgorithmExperiment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "algorithmVersion" TEXT NOT NULL,
    "variantLabel" TEXT NOT NULL,
    "algorithmConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "trafficAllocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetingCriteria" JSONB,
    "successMetrics" JSONB,
    "experimentResults" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlgorithmExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vectorData" JSONB,
    "embeddingVersion" TEXT,
    "modelType" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityMetrics" JSONB,

    CONSTRAINT "UserEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieEmbedding" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "vectorData" JSONB,
    "embeddingVersion" TEXT,
    "modelType" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "similarityCache" JSONB,

    CONSTRAINT "MovieEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionLog" (
    "id" TEXT NOT NULL,
    "recommendationLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "predictedScore" DOUBLE PRECISION NOT NULL,
    "actualAction" TEXT,
    "predictionError" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "featureVector" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'staging',
    "trainingConfig" JSONB,
    "trainingDataInfo" JSONB,
    "metrics" JSONB,
    "trainedAt" TIMESTAMP(3),
    "deployedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationMetrics" (
    "id" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "metricType" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'all',
    "aggregationLevel" TEXT NOT NULL DEFAULT 'daily',
    "value" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL,
    "percentiles" JSONB,
    "comparison" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationEvent_parentLogId_timestamp_idx" ON "RecommendationEvent"("parentLogId", "timestamp");

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_timestamp_idx" ON "RecommendationEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "RecommendationEvent_eventType_timestamp_idx" ON "RecommendationEvent"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "RecommendationEvent_parentLogId_eventType_idx" ON "RecommendationEvent"("parentLogId", "eventType");

-- CreateIndex
CREATE INDEX "FilterSession_userId_startedAt_idx" ON "FilterSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "FilterSession_status_startedAt_idx" ON "FilterSession"("status", "startedAt");

-- CreateIndex
CREATE INDEX "FilterSession_userId_status_idx" ON "FilterSession"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");

-- CreateIndex
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "UserSession_outcome_startedAt_idx" ON "UserSession"("outcome", "startedAt");

-- CreateIndex
CREATE INDEX "UserSession_entryPoint_outcome_idx" ON "UserSession"("entryPoint", "outcome");

-- CreateIndex
CREATE INDEX "UserSession_startedAt_idx" ON "UserSession"("startedAt");

-- CreateIndex
CREATE INDEX "IntentSignal_userId_createdAt_idx" ON "IntentSignal"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IntentSignal_recommendationLogId_signalType_idx" ON "IntentSignal"("recommendationLogId", "signalType");

-- CreateIndex
CREATE INDEX "IntentSignal_intensityScore_signalType_idx" ON "IntentSignal"("intensityScore", "signalType");

-- CreateIndex
CREATE INDEX "IntentSignal_signalType_createdAt_idx" ON "IntentSignal"("signalType", "createdAt");

-- CreateIndex
CREATE INDEX "NegativeFeedback_userId_createdAt_idx" ON "NegativeFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "NegativeFeedback_detailedReason_createdAt_idx" ON "NegativeFeedback"("detailedReason", "createdAt");

-- CreateIndex
CREATE INDEX "NegativeFeedback_feedbackType_severity_idx" ON "NegativeFeedback"("feedbackType", "severity");

-- CreateIndex
CREATE INDEX "NegativeFeedback_createdAt_idx" ON "NegativeFeedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlgorithmExperiment_experimentId_key" ON "AlgorithmExperiment"("experimentId");

-- CreateIndex
CREATE INDEX "AlgorithmExperiment_status_startedAt_idx" ON "AlgorithmExperiment"("status", "startedAt");

-- CreateIndex
CREATE INDEX "AlgorithmExperiment_algorithmVersion_status_idx" ON "AlgorithmExperiment"("algorithmVersion", "status");

-- CreateIndex
CREATE INDEX "AlgorithmExperiment_experimentId_variantLabel_idx" ON "AlgorithmExperiment"("experimentId", "variantLabel");

-- CreateIndex
CREATE INDEX "AlgorithmExperiment_status_trafficAllocation_idx" ON "AlgorithmExperiment"("status", "trafficAllocation");

-- CreateIndex
CREATE UNIQUE INDEX "UserEmbedding_userId_key" ON "UserEmbedding"("userId");

-- CreateIndex
CREATE INDEX "UserEmbedding_userId_idx" ON "UserEmbedding"("userId");

-- CreateIndex
CREATE INDEX "UserEmbedding_modelType_idx" ON "UserEmbedding"("modelType");

-- CreateIndex
CREATE INDEX "UserEmbedding_computedAt_idx" ON "UserEmbedding"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MovieEmbedding_tmdbId_key" ON "MovieEmbedding"("tmdbId");

-- CreateIndex
CREATE INDEX "MovieEmbedding_tmdbId_idx" ON "MovieEmbedding"("tmdbId");

-- CreateIndex
CREATE INDEX "MovieEmbedding_mediaType_idx" ON "MovieEmbedding"("mediaType");

-- CreateIndex
CREATE INDEX "MovieEmbedding_modelType_idx" ON "MovieEmbedding"("modelType");

-- CreateIndex
CREATE INDEX "MovieEmbedding_computedAt_idx" ON "MovieEmbedding"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionLog_recommendationLogId_key" ON "PredictionLog"("recommendationLogId");

-- CreateIndex
CREATE INDEX "PredictionLog_predictedScore_idx" ON "PredictionLog"("predictedScore");

-- CreateIndex
CREATE INDEX "PredictionLog_actualAction_idx" ON "PredictionLog"("actualAction");

-- CreateIndex
CREATE INDEX "PredictionLog_modelVersion_computedAt_idx" ON "PredictionLog"("modelVersion", "computedAt");

-- CreateIndex
CREATE INDEX "PredictionLog_userId_computedAt_idx" ON "PredictionLog"("userId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_modelName_key" ON "ModelVersion"("modelName");

-- CreateIndex
CREATE INDEX "ModelVersion_modelName_idx" ON "ModelVersion"("modelName");

-- CreateIndex
CREATE INDEX "ModelVersion_status_idx" ON "ModelVersion"("status");

-- CreateIndex
CREATE INDEX "ModelVersion_deployedAt_idx" ON "ModelVersion"("deployedAt");

-- CreateIndex
CREATE INDEX "RecommendationMetrics_metricType_periodEnd_idx" ON "RecommendationMetrics"("metricType", "periodEnd");

-- CreateIndex
CREATE INDEX "RecommendationMetrics_segment_metricDate_idx" ON "RecommendationMetrics"("segment", "metricDate");

-- CreateIndex
CREATE INDEX "RecommendationMetrics_metricDate_idx" ON "RecommendationMetrics"("metricDate");

-- CreateIndex
CREATE INDEX "RecommendationMetrics_aggregationLevel_metricDate_idx" ON "RecommendationMetrics"("aggregationLevel", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationMetrics_metricDate_metricType_segment_aggrega_key" ON "RecommendationMetrics"("metricDate", "metricType", "segment", "aggregationLevel");

-- CreateIndex
CREATE INDEX "RatingHistory_recommendationLogId_idx" ON "RatingHistory"("recommendationLogId");

-- CreateIndex
CREATE INDEX "RecommendationLog_algorithm_shownAt_idx" ON "RecommendationLog"("algorithm", "shownAt");

-- CreateIndex
CREATE INDEX "RecommendationLog_userId_action_shownAt_idx" ON "RecommendationLog"("userId", "action", "shownAt");

-- CreateIndex
CREATE INDEX "Tag_recommendationCount_idx" ON "Tag"("recommendationCount");

-- CreateIndex
CREATE INDEX "WatchList_recommendationCount_idx" ON "WatchList"("recommendationCount");

-- CreateIndex
CREATE INDEX "WatchList_lastRecommendedAt_idx" ON "WatchList"("lastRecommendedAt");

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_recommendationLogId_fkey" FOREIGN KEY ("recommendationLogId") REFERENCES "RecommendationLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_parentLogId_fkey" FOREIGN KEY ("parentLogId") REFERENCES "RecommendationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSession" ADD CONSTRAINT "FilterSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterSession" ADD CONSTRAINT "FilterSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentSignal" ADD CONSTRAINT "IntentSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentSignal" ADD CONSTRAINT "IntentSignal_recommendationLogId_fkey" FOREIGN KEY ("recommendationLogId") REFERENCES "RecommendationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegativeFeedback" ADD CONSTRAINT "NegativeFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegativeFeedback" ADD CONSTRAINT "NegativeFeedback_recommendationLogId_fkey" FOREIGN KEY ("recommendationLogId") REFERENCES "RecommendationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEmbedding" ADD CONSTRAINT "UserEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionLog" ADD CONSTRAINT "PredictionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionLog" ADD CONSTRAINT "PredictionLog_recommendationLogId_fkey" FOREIGN KEY ("recommendationLogId") REFERENCES "RecommendationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
