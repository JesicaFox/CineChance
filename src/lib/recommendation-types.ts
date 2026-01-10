/**
 * Типы для v2/v3 рекомендательной системы
 * Используются для типизации JSON-полей в Prisma моделях
 */

// ============================================
// Типы для RecommendationLog
// ============================================

/**
 * Слепок конфигурации фильтров на момент показа рекомендации
 */
export interface FiltersSnapshot {
  contentTypes: {
    movie: boolean;
    tv: boolean;
    anime: boolean;
  };
  lists: {
    want: boolean;
    watched: boolean;
  };
  additionalFilters?: {
    minRating?: number;
    maxRating?: number;
    yearFrom?: string;
    yearTo?: string;
    selectedGenres?: number[];
  };
}

/**
 * Статистика о пуле кандидатов на этапе формирования рекомендации
 */
export interface CandidatePoolMetrics {
  initialCount: number;
  afterTypeFilter: number;
  afterCooldown: number;
  afterAdditionalFilters: number;
  ratingDistribution?: Record<number, number>;
  genreDistribution?: Record<string, number>;
}

/**
 * Временной контекст показа рекомендации
 */
export interface TemporalContext {
  hourOfDay: number;
  dayOfWeek: number;
  isFirstSessionOfDay: boolean;
  hoursSinceLastSession?: number;
  sessionsLastWeek?: number;
  isWeekend: boolean;
}

/**
 * Признаки для ML-моделей
 */
export interface MLFeatures {
  similarityScore: number;
  noveltyScore: number;
  diversityScore: number;
  predictedAcceptanceProbability: number;
  predictedRating?: number;
}

/**
 * Расширенный контекст рекомендации
 */
export interface RecommendationContext {
  source: 'recommendations_page' | 'modal_recommendation' | 'sidebar';
  position: number;
  candidatesCount: number;
  previousLogId?: string;
  timeSincePrevious?: number;
  userStatus?: string;
  filtersChanged?: boolean;
}

// ============================================
// Типы для User
// ============================================

/**
 * Агрегированная статистика пользователя по рекомендациям
 */
export interface UserRecommendationStats {
  totalRecommendationsReceived: number;
  totalAccepted: number;
  totalSkipped: number;
  acceptanceRate: number;
  averageTimeToActionMs: number;
  favoriteGenre?: string;
  averageRatingGiven?: number;
  lastActivityAt?: Date;
  streakDays?: number;
}

/**
 * Снимок текущих предпочтений пользователя
 */
export interface UserPreferencesSnapshot {
  preferredContentTypes: {
    movie: boolean;
    tv: boolean;
    anime: boolean;
  };
  preferredLists: {
    want: boolean;
    watched: boolean;
  };
  preferredGenres?: number[];
  averageRatingThreshold?: number;
  preferredDecade?: string;
}

// ============================================
// Типы для FilterSession
// ============================================

/**
 * История изменения одного фильтра
 */
export interface FilterChange {
  timestamp: Date;
  parameterName: string;
  previousValue: unknown;
  newValue: unknown;
  changeReason?: 'user_initiated' | 'recommendation_rejected' | 'api_update';
}

/**
 * Метрики результата сессии фильтров
 */
export interface FilterSessionResultMetrics {
  recommendationsShown: number;
  acceptedCount: number;
  skippedCount: number;
  historyResetUsed: boolean;
  forcedCooldownUsed: boolean;
  outcome: 'success' | 'partial' | 'abandoned' | 'error';
}

/**
 * Информация о фильтре, изменённом после неудачной рекомендации
 */
export interface AbandonedFilter {
  recommendationId: string;
  previousFilter: string;
  filterValue: unknown;
  timestamp: Date;
}

// ============================================
// Типы для UserSession
// ============================================

/**
 * Технический контекст устройства
 */
export interface DeviceContext {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'tv';
  os: string;
  browser: string;
  screenResolution: string;
  viewportSize: { width: number; height: number };
  isTouch: boolean;
  connectionType?: string;
  language?: string;
}

/**
 * Агрегированные данные о потоке сессии
 */
export interface SessionFlow {
  recommendationsShown: number;
  filtersChangedCount: number;
  modalOpenedCount: number;
  actionsCount: number;
  recommendationsAccepted: number;
  recommendationsSkipped: number;
  historyResetCount: number;
  errorsCount: number;
}

/**
 * Метрики результата сессии
 */
export interface SessionOutcomeMetrics {
  timeToFirstActionMs?: number;
  timeToAcceptMs?: number;
  timeToFilterChangeMs?: number;
  finalFilters?: FiltersSnapshot;
}

// ============================================
// Типы для RecommendationEvent
// ============================================

/**
 * Параметры события изменения фильтра
 */
export interface FilterChangeEventData {
  parameterName: string;
  previousValue: unknown;
  newValue: unknown;
  changeSource: 'user_input' | 'preset' | 'api' | 'reset';
}

/**
 * Параметры события клика на действие
 */
export interface ActionClickEventData {
  action: 'accept' | 'skip' | 'open_details' | 'back_to_filters';
  timeSinceShownMs: number;
  interfaceState: Record<string, unknown>;
}

/**
 * Параметры события наведения
 */
export interface HoverEventData {
  elementType: 'poster' | 'title' | 'rating' | 'genres' | 'description';
  elementPosition: { x: number; y: number; viewportPercentage: number };
  hoverDurationMs: number;
}

/**
 * Параметры события (зависят от типа)
 */
export interface RecommendationEventData {
  filter_change?: FilterChangeEventData;
  action_click?: ActionClickEventData;
  hover_start?: HoverEventData;
  hover_end?: HoverEventData;
  [key: string]: unknown;
}

// ============================================
// Типы для IntentSignal
// ============================================

/**
 * Контекст элемента интерфейса
 */
export interface ElementContext {
  elementType: 'poster' | 'title' | 'overview' | 'rating' | 'genres' | 'cast' | 'crew' | 'runtime' | 'release_date' | 'language';
  elementPosition: { x: number; y: number; viewportPercentage: number };
  elementVisibility: number;
  zIndex?: number;
}

/**
 * Временной контекст неявного сигнала
 */
export interface SignalTemporalContext {
  timeSinceShownMs: number;
  timeSinceSessionStartMs: number;
  timeOfDay: number;
  dayOfWeek: number;
}

/**
 * ML-определённый вектор намерений
 */
export interface PredictedIntent {
  interestProbability: number;
  acceptanceProbability: number;
  skipProbability: number;
  explorationProbability: number;
}

// ============================================
// Типы для NegativeFeedback
// ============================================

/**
 * Контекстуальные факторы отклонения
 */
export interface ContextualFactors {
  moodPredicted?: string;
  recentAcceptedGenres?: string[];
  timeOfDay: number;
  sessionDuration: number;
  recommendationsInSession: number;
}

/**
 * Корректирующее действие для алгоритма
 */
export interface CorrectiveAction {
  suggestedWeightAdjustment?: Record<string, number>;
  suggestedFilterAdjustment?: Record<string, unknown>;
  confidence: number;
  applied: boolean;
}

// ============================================
// Типы для AlgorithmExperiment
// ============================================

/**
 * Критерии таргетинга эксперимента
 */
export interface TargetingCriteria {
  minRatings?: number;
  maxRatings?: number;
  minSessions?: number;
  registrationAgeDays?: number;
  userSegments?: string[];
  devices?: string[];
  languages?: string[];
  geoAllow?: string[];
  geoDeny?: string[];
}

/**
 * Конфигурация алгоритма для варианта эксперимента
 */
export interface AlgorithmConfig {
  genreWeight?: number;
  ratingWeight?: number;
  noveltyWeight?: number;
  diversityWeight?: number;
  [key: string]: number | undefined;
}

/**
 * Метрики успеха эксперимента
 */
export interface SuccessMetrics {
  primaryMetric: 'acceptance_rate' | 'watch_rate' | 'rating_average';
  primaryGoal: 'increase' | 'decrease' | 'stay_same';
  primaryThreshold: number;
  secondaryMetrics?: string[];
  guardRailMetrics?: string[];
}

/**
 * Результаты эксперимента
 */
export interface ExperimentResults {
  sampleSize: number;
  controlSize: number;
  treatmentSize: number;
  primaryMetricMean: Record<string, number>;
  primaryMetricStd: Record<string, number>;
  confidenceInterval: { lower: number; upper: number };
  pValue: number;
  winner?: string;
  lift?: number;
  recommendation?: string;
}

// ============================================
// Типы для MovieEmbedding
// ============================================

/**
 * Кэш похожих фильмов
 */
export interface SimilarityCache {
  topSimilar: Array<{ tmdbId: number; mediaType: string; similarity: number }>;
  genreSimilarity: Record<string, number>;
  castSimilarity: Record<string, number>;
}

// ============================================
// Типы для ModelVersion
// ============================================

/**
 * Информация о данных обучения
 */
export interface TrainingDataInfo {
  totalSamples: number;
  trainingSetSize: number;
  validationSetSize: number;
  features: string[];
  trainingDate: Date;
}

// ============================================
// Типы для RecommendationMetrics
// ============================================

/**
 * Перцентили распределения
 */
export interface Percentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

/**
 * Сравнение с предыдущим периодом
 */
export interface PeriodComparison {
  previousValue: number;
  changeAbsolute: number;
  changePercent: number;
  trendDirection: 'up' | 'down' | 'stable';
}
