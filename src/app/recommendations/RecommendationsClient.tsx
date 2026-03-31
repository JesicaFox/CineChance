// src/app/recommendations/RecommendationsClient.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RecommendationCard from './RecommendationCard';
import FilterForm from './FilterForm';
import SessionTracker from './SessionTracker';
import FilterStateManager from './FilterStateManager';
import { useSessionTracking } from './useSessionTracking';
import { logger } from '@/lib/logger';
import { useDebounce } from './useDebounce';
import { validateFilters, areFiltersValid, getFirstValidationError } from './filterValidation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ContentType, ListType, FilterValue } from '@/lib/recommendation-types';
import { AppErrorBoundary } from '@/app/components/ErrorBoundary';
import { getUserTags } from '@/app/actions/tagsActions';

// Типы данных
interface MovieData {
  id: number;
  media_type: 'movie' | 'tv' | 'anime' | 'cartoon';
  title: string;
  name: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string | null;
  first_air_date: string | null;
  overview: string;
  runtime: number;
  genres: { id: number; name: string }[];
  genre_ids?: number[];
  original_language?: string;
  production_countries?: { name: string }[];
  cast?: { id: number; name: string; character: string; profilePath: string | null }[];
  crew?: { id: number; name: string; job: string; department: string; profilePath: string | null }[];
}

interface RecommendationResponse {
  success: boolean;
  movie: MovieData | null;
  logId: string | null;
  userStatus: 'want' | 'watched' | 'dropped' | 'rewatched' | null;
  cineChanceRating: number | null;
  cineChanceVoteCount: number;
  userRating: number | null;
  watchCount: number;
  message?: string;
  stats?: {
    totalItems: number;
    availableCandidates: number;
    isSmallLibrary: boolean;
    suggestions: {
      addMoreMovies: boolean;
      expandTypes: boolean;
      includeOtherLists: boolean;
      lowerRating?: boolean;
    };
  };
  suggestions?: {
    expandTypes: boolean;
    includeOtherLists: boolean;
    lowerRating: boolean;
    addMoreMovies: boolean;
  };
  debug?: {
    tmdbCalls: number;
    dbRecords: number;
    cached: boolean;
    fetchDuration: number;
    filters: FilterState;
  };
}

interface ActionResponse {
  success: boolean;
  message: string;
  logId: string;
}

interface RecommendationsClientProps {
  userId: string;
}

const ADMIN_USER_ID = 'cmkbc7sn2000104k3xd3zyf2a';

interface AdditionalFilters {
  [key: string]: unknown;
  minRating: number;
  yearFrom: string;
  yearTo: string;
  selectedGenres: number[];
  selectedTags: string[];
}

type ViewState = 'filters' | 'loading' | 'result' | 'error' | 'suggestions';

type FilterState = {
  types: ContentType[];
  lists: ListType[];
  additionalFilters?: AdditionalFilters;
};

// Типы для отслеживания
interface FilterChange {
  timestamp: string;
  parameterName: string;
  previousValue: FilterValue;
  newValue: FilterValue;
  changeSource: 'user_input' | 'preset' | 'api' | 'reset';
  [key: string]: unknown;
}

export default function RecommendationsClient({ userId }: RecommendationsClientProps) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>('filters');
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<'want' | 'watched' | 'dropped' | 'rewatched' | null>(null);
  const [isAnime, setIsAnime] = useState(false);
  const [cineChanceRating, setCineChanceRating] = useState<number | null>(null);
  const [cineChanceVoteCount, setCineChanceVoteCount] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [watchCount, setWatchCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noAvailable, setNoAvailable] = useState(false);
  const [stats, setStats] = useState<{
    totalItems: number;
    availableCandidates: number;
    isSmallLibrary: boolean;
    suggestions: {
      addMoreMovies: boolean;
      expandTypes: boolean;
      includeOtherLists: boolean;
    };
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [filterErrors, setFilterErrors] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    apiStatus: string;
    dbQuery: string;
    cache: string;
    fetchDuration: number;
    tmdbCalls: number;
    dbRecords: number;
  }>({
    apiStatus: 'Idle',
    dbQuery: 'None',
    cache: 'Empty',
    fetchDuration: 0,
    tmdbCalls: 0,
    dbRecords: 0
  });
  
  // Refs для управления интервалами и таймаутами
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchStartTime = useRef<number>(0);
  const [userMinRating, setUserMinRating] = useState<number>(6.0); // Настройка minRating пользователя
  const [userListPreferences, setUserListPreferences] = useState<{
    includeWant: boolean;
    includeWatched: boolean;
    includeDropped: boolean;
  }>({
    includeWant: true,
    includeWatched: true,
    includeDropped: false,
  });
  const [userContentTypePreferences, setUserContentTypePreferences] = useState<{
    includeMovie: boolean;
    includeTv: boolean;
    includeAnime: boolean;
    includeCartoon: boolean;
  }>({
    includeMovie: true,
    includeTv: true,
    includeAnime: true,
    includeCartoon: true,
  });
  const [availableGenres, setAvailableGenres] = useState<{ id: number; name: string }[]>([]);
  const [userTags, setUserTags] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true); // Флаг загрузки настроек
  const [currentFilters, setCurrentFilters] = useState<{
    types: ContentType[];
    lists: ListType[];
    additionalFilters?: AdditionalFilters;
  } | null>(null);

  // Загружаем настройки пользователя при монтировании
  useEffect(() => {
    const fetchUserSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const response = await fetch('/api/user/settings');
        
        // Handle 429 specifically - show error notification
        if (response.status === 429) {
          logger.warn('Rate limit exceeded when fetching user settings', {
            context: 'RecommendationsClient'
          });
          // Keep default values and show subtle indicator that settings couldn't be loaded
          setIsLoadingSettings(false);
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          // API возвращает 5.0 если значение null или undefined
          if (data.minRating !== undefined && data.minRating !== null) {
            setUserMinRating(data.minRating);
          }
          // Загружаем настройки списков
          setUserListPreferences({
            includeWant: data.includeWant ?? true,
            includeWatched: data.includeWatched ?? true,
            includeDropped: data.includeDropped ?? false,
          });
          // Загружаем настройки типов контента
          setUserContentTypePreferences({
            includeMovie: data.includeMovie ?? true,
            includeTv: data.includeTv ?? true,
            includeAnime: data.includeAnime ?? true,
            includeCartoon: data.includeCartoon ?? true,
          });
        }
      } catch (error) {
        logger.error('Failed to fetch user settings', { error: error instanceof Error ? error.message : String(error) });
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchUserSettings();
  }, []);

  // Загружаем доступные жанры из списков пользователя
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch('/api/user/genres');
        if (response.ok) {
          const data = await response.json();
          if (data.genres) {
            setAvailableGenres(data.genres);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch user genres', { error: error instanceof Error ? error.message : String(error) });
      }
    };
    fetchGenres();
    fetchUserTags();
  }, []);

  // Загружаем теги пользователя
  const fetchUserTags = async () => {
    try {
      const result = await getUserTags(userId);
      if (result.success && result.data) {
        setUserTags(result.data.map(tag => ({
          id: tag.id,
          name: tag.name,
          count: tag.usageCount
        })));
      }
    } catch (error) {
      logger.error('Error fetching user tags', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Получение года из даты
  const getYear = (movieData: MovieData) => {
    const date = movieData.release_date || movieData.first_air_date;
    return date ? date.split('-')[0] : '—';
  };

  // Записать действие пользователя
  const recordAction = useCallback(async (action: string) => {
    if (!logId) return null;

    try {
      const res = await fetch(`/api/recommendations/${logId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data: ActionResponse = await res.json();
      return data;
    } catch (err) {
      logger.error('Failed to record action', { logId, action, error: err });
      return null;
    }
  }, [logId]);

  // Получение рекомендации с фильтрами
  const fetchRecommendation = useCallback(async (
    types: ContentType[],
    lists: ListType[],
    additionalFilters?: AdditionalFilters,
    tracking?: ReturnType<typeof useSessionTracking>
  ) => {
    // Валидация фильтров
    const validationErrors = validateFilters(types, lists, additionalFilters);
    if (validationErrors.length > 0) {
      setFilterErrors(validationErrors.map(error => error.message));
      logger.warn('Filter validation failed', { errors: validationErrors, types, lists, additionalFilters });
      return;
    }

    // Очищаем ошибки валидации
    setFilterErrors([]);

    const isFirstCall = !fetchStartTime.current;
    if (isFirstCall) {
      fetchStartTime.current = Date.now();
      setProgress(0);
      if (tracking) {
        tracking.startFilterSession();
      }
    }

    // Используем переданные фильтры вместо currentFilters
    const currentFilterState = { types, lists, additionalFilters };
    setCurrentFilters(currentFilterState);

    setViewState('loading');
    setErrorMessage(null);
    setNoAvailable(false);
    setMovie(null);
    setUserStatus(null);
    setIsAnime(false);
    setCineChanceRating(null);
    setCineChanceVoteCount(0);
    setUserRating(null);
    setWatchCount(0);

    // Запускаем анимацию прогресса сразу после начала загрузки
    const progressAnimation = () => {
      let currentProgress = 0;
      
      // Очищаем предыдущий интервал если есть
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      progressIntervalRef.current = setInterval(() => {
        // Медленный прогресс до 70% во время загрузки
        if (currentProgress < 70) {
          currentProgress += Math.random() * 3 + 1; // 1-4% каждые 200мс
          setProgress(Math.min(currentProgress, 70));
        } else {
          // Замедляемся при подходе к 70%
          currentProgress += Math.random() * 0.5 + 0.2;
          setProgress(Math.min(currentProgress, 75));
        }
      }, 200);
    };
    progressAnimation();

    // Обновляем debug информацию
    setDebugInfo({
      apiStatus: 'Fetching...',
      dbQuery: 'Preparing...',
      cache: 'Checking...',
      fetchDuration: 0,
      tmdbCalls: 0,
      dbRecords: 0
    });

    try {
      // Формируем URL с параметрами фильтров
      const params = new URLSearchParams();
      params.set('types', types.join(','));
      params.set('lists', lists.join(','));
      params.set('userId', userId); // Добавляем userId для проверки прав
      
      // Логируем отправляемые параметры для отладки
      logger.info('Sending recommendation request', {
        types,
        lists,
        additionalFilters,
        userId,
        paramsString: params.toString()
      });

      // Добавляем дополнительные фильтры
      if (additionalFilters) {
        if (additionalFilters.minRating > 0) {
          params.set('minRating', additionalFilters.minRating.toString());
        }
        if (additionalFilters.yearFrom) {
          params.set('yearFrom', additionalFilters.yearFrom);
        }
        if (additionalFilters.yearTo) {
          params.set('yearTo', additionalFilters.yearTo);
        }
        if (additionalFilters.selectedGenres.length > 0) {
          params.set('genres', additionalFilters.selectedGenres.join(','));
        }
        if (additionalFilters.selectedTags.length > 0) {
          params.set('tags', additionalFilters.selectedTags.join(','));
        }
      }

      const res = await fetch(`/api/recommendations/random?${params.toString()}`);
      const data: RecommendationResponse = await res.json();
      const fetchEndTime = Date.now();
      const fetchDuration = fetchEndTime - fetchStartTime.current;

      // Обновляем debug информацию после ответа
      setDebugInfo({
        apiStatus: res.ok ? 'Success' : `Error (${res.status})`,
        dbQuery: data.success ? 'Optimized' : 'Failed',
        cache: data.debug?.cached ? 'Hit' : 'Miss',
        fetchDuration,
        tmdbCalls: data.debug?.tmdbCalls || 0,
        dbRecords: data.debug?.dbRecords || 0
      });

      if (data.success && data.movie) {
        // Логируем успешный ответ для отладки
        logger.info('Recommendation response received', {
          movieId: data.movie.id,
          movieTitle: data.movie.title || data.movie.name,
          movieType: data.movie.media_type,
          debug: data.debug
        });
        
        // Сохраняем статистику
        if (data.stats) {
          setStats(data.stats);
        }
        
        // Останавливаем анимацию прогресса
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        setMovie(data.movie);
        setLogId(data.logId);
        setUserStatus(data.userStatus);
        setCineChanceRating(data.cineChanceRating);
        setCineChanceVoteCount(data.cineChanceVoteCount);
        setUserRating(data.userRating);
        setWatchCount(data.watchCount);

        // Проверка на аниме
        const isAnimeCheck = (data.movie.genre_ids?.includes(16) || data.movie.genres?.some(g => g.id === 16)) &&
                            data.movie.original_language === 'ja';
        setIsAnime(isAnimeCheck);

        // Обновляем метрики сессии и записываем событие
        if (tracking) {
          tracking.incrementRecommendationsShown();
          tracking.trackEvent('page_view', {
            page: 'recommendation_result',
            fetchDuration,
            filters: currentFilterState,
          });
        }

        // Завершаем прогресс бар
        setProgress(100);
        setTimeout(() => setViewState('result'), 300); // Небольшая задержка для визуала
      } else {
        // Останавливаем анимацию прогресса
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        // Сохраняем статистику из ответа об ошибке
        if (data.stats) {
          setStats(data.stats);
        }
        
        if (data.message?.includes('Выбранные списки пусты') ||
            data.message?.includes('Все доступные рекомендации')) {
          setNoAvailable(true);
        }
        
        setErrorMessage(data.message || 'Ошибка при получении рекомендации');
        setProgress(100);
        setViewState('error');
      }
    } catch (err) {
      // Останавливаем анимацию прогресса
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      logger.error('Failed to fetch recommendation', { error: err, filters: currentFilterState });
      setErrorMessage('Ошибка при загрузке рекомендации');
      setProgress(100);
      setViewState('error');
    }
  }, []);

  // Дебаунсим fetchRecommendation для предотвращения race conditions
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedFetchRecommendation = useCallback((...args: Parameters<typeof fetchRecommendation>) => {
    // Отменяем предыдущий таймаут
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Устанавливаем новый таймаут
    timeoutRef.current = setTimeout(() => {
      fetchRecommendation(...args);
    }, 300);
  }, [fetchRecommendation]);

  // Сброс логов рекомендаций
  const handleResetLogs = async () => {
    setIsResetConfirmOpen(true);
  };

  // Подтверждение сброса истории
  const confirmResetLogs = async () => {
    setIsResetConfirmOpen(false);
    setIsResetting(true);
    setResetMessage(null);

    try {
      const res = await fetch('/api/recommendations/reset-logs', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setResetMessage({ type: 'success', text: data.message || 'История рекомендаций очищена' });
        fetchStartTime.current = 0;
        setViewState('filters');
        setTimeout(() => setResetMessage(null), 3000);
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Ошибка при очистке истории' });
      }
    } catch (err) {
      logger.error('Failed to reset recommendation logs', { error: err });
      setResetMessage({ type: 'error', text: 'Ошибка соединения' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AppErrorBoundary
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Рекомендации временно недоступны
            </h2>
            <p className="text-gray-400 mb-4">
              Что-то пошло не так при загрузке рекомендаций.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
            >
              Обновить страницу
            </button>
          </div>
        </div>
      }
    >
      <SessionTracker userId={userId} logId={logId}>
        {(tracking) => {
          // Возврат к фильтрам
          const handleBackToFilters = () => {
            // Записываем событие возврата к фильтрам
            if (logId) {
              tracking.trackEvent('action_click', {
                action: 'back_to_filters',
                timeSinceShownMs: fetchStartTime.current ? Date.now() - fetchStartTime.current : 0,
              });
            }

            fetchStartTime.current = 0;
            setViewState('filters');
            setMovie(null);
            setLogId(null);
            setUserStatus(null);
            setIsAnime(false);
            setCineChanceRating(null);
            setCineChanceVoteCount(0);
            setUserRating(null);
            setWatchCount(0);
          };

        // Обработчик "Пропустить"
        const handleSkip = async () => {
          if (actionLoading || !logId) return;

          setActionLoading(true);

          // Записываем событие пропуска
          await tracking.trackEvent('action_click', {
            action: 'skip',
            timeSinceShownMs: fetchStartTime.current ? Date.now() - fetchStartTime.current : 0,
          });

          // Записываем негативную обратную связь (автоматически как "not_interested")
          await fetch('/api/recommendations/negative-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              recommendationLogId: logId,
              feedbackType: 'not_interested',
              contextualFactors: {
                timeOfDay: new Date().getHours(),
              },
            }),
          }).catch(() => {});

          tracking.incrementActionsCount();
          tracking.incrementRecommendationsSkipped();

          await recordAction('skipped');
          fetchStartTime.current = 0;
          
          // Используем сохраненные фильтры для повторной рекомендации
          if (currentFilters) {
            const { types, lists, additionalFilters } = currentFilters;
            await fetchRecommendation(
              types.length > 0 ? types : ['movie', 'tv', 'anime'],
              lists.length > 0 ? lists : ['want', 'watched'],
              additionalFilters,
              tracking
            );
          } else {
            // Если фильтры не сохранены, используем значения по умолчанию
            await fetchRecommendation(['movie', 'tv', 'anime'], ['want', 'watched'], undefined, tracking);
          }
          setActionLoading(false);
        };

        // Обработчик "Отлично! Посмотрю"
        const handleAccept = async () => {
          if (actionLoading || !logId || !movie) return;

          setActionLoading(true);

          // Записываем событие принятия
          await tracking.trackEvent('action_click', {
            action: 'accept',
            timeSinceShownMs: fetchStartTime.current ? Date.now() - fetchStartTime.current : 0,
          });

          tracking.incrementActionsCount();
          tracking.incrementRecommendationsAccepted();

          await recordAction('accepted');

          // Сохраняем данные фильма в sessionStorage для передачи на страницу Мои фильмы
          sessionStorage.setItem('recommendationAccepted', JSON.stringify({
            tmdbId: movie.id,
            mediaType: movie.media_type,
            title: movie.title || movie.name,
            year: getYear(movie),
            logId: logId,
          }));

          router.push('/my-movies');
        };

        // Передаем обработчик открытия модального окна в дочерние компоненты
        const handleInfoClick = useCallback(() => {
          tracking.handleModalOpen();
        }, [tracking]);

        return (
          <FilterStateManager
            initialFilters={{
              lists: [
                ...(userListPreferences.includeWant ? ['want'] as const : []),
                ...(userListPreferences.includeWatched ? ['watched'] as const : []),
                ...(userListPreferences.includeDropped ? ['dropped'] as const : []),
              ],
              types: [
                ...(userContentTypePreferences.includeMovie ? ['movie'] as const : []),
                ...(userContentTypePreferences.includeTv ? ['tv'] as const : []),
                ...(userContentTypePreferences.includeAnime ? ['anime'] as const : []),
                ...(userContentTypePreferences.includeCartoon ? ['cartoon'] as const : []),
              ],
            }}
            onFiltersChange={() => {}}
            onFilterChange={(parameterName, previousValue, newValue) => {
              tracking.trackFilterChange(parameterName, previousValue, newValue);
            }}
          >
            {({ filters, updateFilter, updateAdditionalFilter, resetFilters }) => (
              <div className="min-h-screen bg-gray-950">
                <div className="container mx-auto px-3 sm:px-4 py-4">
                  {/* Заголовок */}
                  <h1 className="text-base sm:text-lg font-medium text-white mb-6">
                    Что посмотреть?
                  </h1>

                  {/* Состояние: Фильтры */}
                  {viewState === 'filters' && (
                    <>
                      {isLoadingSettings ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                          <div className="flex items-center gap-3 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm">Загрузка настроек...</span>
                          </div>
                        </div>
                      ) : (
                        <FilterForm
                          onSubmit={(types, lists, additionalFilters) =>
                            debouncedFetchRecommendation(types as ContentType[], lists as ListType[], additionalFilters, tracking)
                          }
                          isLoading={false}
                          initialMinRating={userMinRating}
                          initialTypes={filters.types}
                          initialLists={filters.lists}
                          availableGenres={availableGenres}
                          userTags={userTags}
                          updateAdditionalFilter={updateAdditionalFilter}
                          onTypeChange={(types) => updateFilter('types', types)}
                          onListChange={(lists) => updateFilter('lists', lists)}
                          onAdditionalFilterChange={(additionalFilters) => {
                            // Обновляем все поля additionalFilters
                            if (filters.additionalFilters && additionalFilters) {
                              Object.keys(additionalFilters).forEach(key => {
                                const filterKey = key as keyof typeof additionalFilters;
                                if (additionalFilters[filterKey] !== filters.additionalFilters?.[filterKey]) {
                                  updateAdditionalFilter(filterKey, additionalFilters[filterKey]);
                                }
                              });
                            }
                          }}
                        />
                      )}
                    </>
                  )}

                  {/* Состояние: Загрузка */}
                  {viewState === 'loading' && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh]">
                      {/* Прогресс бар */}
                      <div className="w-full max-w-xs">
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-150 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-gray-400 text-xs text-center">{Math.round(progress)}%</p>
                      </div>
                      
                      {/* Информативные сообщения */}
                      <div className="text-center mt-4">
                        <p className="text-gray-500 text-sm mb-2">
                          {progress < 30 ? '🍿 Готовим попкорн...' :
                           progress < 60 ? '🎬 Заряжаем киноленту...' :
                           progress < 85 ? '🎭 Ищем идеальный фильм...' :
                           '🌟 Почти готово...'}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {progress < 30 ? 'Выбираем лучшие сорта кукурузы' :
                           progress < 60 ? 'Настраиваем проектор и звук' :
                           progress < 85 ? 'Сверяемся с вашими предпочтениями' :
                           'Подаем горячий попкорн'}
                        </p>
                      </div>
                      
                      {/* Техническое окно для отладки */}
                      {process.env.NODE_ENV === 'development' && userId === ADMIN_USER_ID && (
                        <div className="mt-6 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 font-mono">🔧 DEBUG MODE</span>
                            <button
                              onClick={() => setDebugMode(!debugMode)}
                              className="text-gray-500 hover:text-gray-300"
                            >
                              {debugMode ? 'Скрыть' : 'Показать'}
                            </button>
                          </div>
                          
                          {debugMode && (
                            <div className="space-y-1 text-gray-500 font-mono">
                              <div>Progress: {Math.round(progress)}%</div>
                              <div>API Status: <span className={debugInfo.apiStatus.includes('Success') ? 'text-green-400' : debugInfo.apiStatus.includes('Error') ? 'text-red-400' : 'text-yellow-400'}>{debugInfo.apiStatus}</span></div>
                              <div>DB Query: <span className={debugInfo.dbQuery === 'Optimized' ? 'text-blue-400' : 'text-red-400'}>{debugInfo.dbQuery}</span></div>
                              <div>Cache: <span className={debugInfo.cache === 'Hit' ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.cache}</span></div>
                              <div>Duration: <span className="text-cyan-400">{debugInfo.fetchDuration}ms</span></div>
                              <div>TMDB Calls: <span className="text-purple-400">{debugInfo.tmdbCalls}</span></div>
                              <div>DB Records: <span className="text-orange-400">{debugInfo.dbRecords}</span></div>
                              
                              {/* Дополнительная debug информация будет доступна после завершения запроса */}
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-gray-600">Note:</div>
                                <div className="text-xs text-gray-400">
                                  Detailed performance metrics will be available after request completion.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Состояние: Результат */}
                  {viewState === 'result' && movie && (
                    <div className="max-w-4xl mx-auto">
                      <RecommendationCard
                        movie={movie}
                        userStatus={userStatus}
                        isAnime={isAnime}
                        cineChanceRating={cineChanceRating}
                        cineChanceVoteCount={cineChanceVoteCount}
                        userRating={userRating}
                        watchCount={watchCount}
                        onSkip={handleSkip}
                        onAccept={handleAccept}
                        onBack={handleBackToFilters}
                        onResetFilters={handleBackToFilters}
                        onInfoClick={handleInfoClick}
                        actionLoading={actionLoading}
                      />
                    </div>
                  )}

                  {/* Состояние: Предложения */}
                  {viewState === 'suggestions' && stats && stats.suggestions && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
                      <div className="text-5xl mb-3">💡</div>
                      <h2 className="text-lg font-bold text-white mb-2">
                        {stats.isSmallLibrary && stats.totalItems <= 3 
                          ? 'У вас мало фильмов в списке!'
                          : 'Хотите больше разнообразия?'
                        }
                      </h2>
                      <p className="text-gray-500 text-sm mb-6">
                        {stats.isSmallLibrary && stats.totalItems <= 3
                          ? `Добавьте больше фильмов для разнообразия рекомендаций`
                          : `Попробуйте наши предложения для улучшения рекомендаций`
                        }
                      </p>
                      
                      {/* Панель предложений */}
                      <div className="bg-gray-800 rounded-lg p-4 mb-6 w-full">
                        <h3 className="text-sm font-semibold text-gray-300 mb-3">Что можно улучшить:</h3>
                        <div className="space-y-2">
                          {stats.suggestions.addMoreMovies && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-yellow-400">🎬</span>
                              <span className="text-gray-300">Добавьте больше фильмов в списки</span>
                            </div>
                          )}
                          {stats.suggestions.expandTypes && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-blue-400">📺</span>
                              <span className="text-gray-300">Включите другие типы контента</span>
                            </div>
                          )}
                          {stats.suggestions.includeOtherLists && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-400">📋</span>
                              <span className="text-gray-300">Попробуйте просмотренные фильмы</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Кнопки действий */}
                      <div className="flex gap-3 flex-wrap justify-center">
                        <button
                          onClick={handleBackToFilters}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
                        >
                          Изменить фильтры
                        </button>
                        {stats.suggestions.addMoreMovies && (
                          <button
                            onClick={() => router.push('/my-movies')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm font-medium"
                          >
                            Добавить фильмы
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Состояние: Ошибка */}
                  {viewState === 'error' && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
                      <div className="text-5xl mb-3">😕</div>
                      <h2 className="text-lg font-bold text-white mb-2">
                        {errorMessage}
                      </h2>
                      <p className="text-gray-500 text-sm mb-6 max-w-xs">
                        {noAvailable
                          ? 'Все фильмы из вашего списка были показаны за последнюю неделю'
                          : 'Попробуйте изменить фильтры или добавить больше фильмов'
                        }
                      </p>
                      

                      {/* Быстрые действия на основе статистики */}
                      {stats && stats.suggestions && (
                        <div className="bg-gray-800 rounded-lg p-4 mb-6 w-full">
                          <h3 className="text-sm font-semibold text-gray-300 mb-3">Быстрые действия:</h3>
                          <div className="flex gap-2 flex-wrap justify-center">
                            {stats.suggestions.expandTypes && (
                              <button
                                onClick={() => {
                                  // Расширить типы контента
                                  const allTypes: ContentType[] = ['movie', 'tv', 'anime'];
                                  fetchRecommendation(allTypes, ['want', 'watched'], undefined, tracking);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors text-xs"
                              >
                                Все типы
                              </button>
                            )}
                            {stats.suggestions.includeOtherLists && (
                              <button
                                onClick={() => {
                                  // Включить все списки
                                  const allLists: ListType[] = ['want', 'watched', 'dropped'];
                                  fetchRecommendation(['movie', 'tv', 'anime'], allLists, undefined, tracking);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition-colors text-xs"
                              >
                                Все списки
                              </button>
                            )}
                            {stats.suggestions.addMoreMovies && (
                              <button
                                onClick={() => router.push('/my-movies')}
                                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition-colors text-xs"
                              >
                                Добавить фильмы
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {noAvailable ? (
                        <div className="flex gap-2 flex-wrap justify-center">
                          <button
                            onClick={handleResetLogs}
                            disabled={isResetting}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition ${
                              isResetting
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-yellow-600 text-white hover:bg-yellow-500 cursor-pointer'
                            }`}
                          >
                            {isResetting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Очистка...
                              </>
                            ) : (
                              'Сбросить рекомендации'
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap justify-center">
                          <button
                            onClick={handleBackToFilters}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
                          >
                            Изменить фильтры
                          </button>
                          {stats?.suggestions?.addMoreMovies && (
                            <button
                              onClick={() => router.push('/my-movies')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm font-medium"
                            >
                              Добавить фильмы
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Сообщение о результате сброса */}
                      {resetMessage && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm max-w-xs ${
                          resetMessage.type === 'success'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {resetMessage.type === 'success' ? (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span>{resetMessage.text}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Модальное окно подтверждения сброса истории */}
                  {isResetConfirmOpen && (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                      <div className="bg-[#0a0e17] border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center">
                          {/* Иконка предупреждения */}
                          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          </div>

                          <h3 className="text-lg font-bold text-white mb-2">Сбросить историю?</h3>
                          <p className="text-gray-400 text-sm mb-6">
                            Это удалит всю историю показов рекомендаций. После этого вы снова сможете получать рекомендации из всех фильмов.
                          </p>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsResetConfirmOpen(false)}
                              className="flex-1 py-2.5 px-3 bg-gray-700/50 border border-gray-600/30 text-gray-300 text-sm rounded-lg font-medium hover:bg-gray-700 hover:text-white transition cursor-pointer"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={confirmResetLogs}
                              className="flex-1 py-2.5 px-3 bg-yellow-600 text-white text-sm rounded-lg font-medium hover:bg-yellow-500 transition cursor-pointer"
                            >
                              Сбросить
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </FilterStateManager>
        );
      }}
    </SessionTracker>
    </AppErrorBoundary>
  );
}
