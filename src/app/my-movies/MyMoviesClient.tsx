// src/app/my-movies/MyMoviesClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const RatingModal = dynamic(() => import('../components/RatingModal'), { ssr: false });
import MovieCard from '../components/MovieCard';
import { MovieCardErrorBoundary } from '../components/ErrorBoundary';
import Loader from '../components/Loader';
import LoaderSkeleton from '../components/LoaderSkeleton';
import FilmFilters, { FilmFilterState, SortState, AdditionalFilters } from './FilmFilters';
import { getMoviesCounts, updateWatchStatus } from './actions';
import { getUserTags } from '../actions/tagsActions';
import { useMyMovies } from '@/hooks/useMyMovies';
import { useBatchData } from '@/hooks';
import { Media } from '@/lib/tmdb';

interface MyMoviesClientProps {
  initialWatched: any[];
  initialWantToWatch: any[];
  initialDropped: any[];
  initialHidden: any[];
  counts: {
    watched: number;
    wantToWatch: number;
    dropped: number;
    hidden: number;
  };
  userId: string;
  initialTab?: 'watched' | 'wantToWatch' | 'dropped' | 'hidden';
}

interface AcceptedRecommendation {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  year: string;
  logId: string;
}

const STATUS_MAP: Record<string, 'want' | 'watched' | 'dropped' | 'rewatched' | null> = {
  'Хочу посмотреть': 'want',
  'Просмотрено': 'watched',
  'Брошено': 'dropped',
  'Пересмотрено': 'rewatched',
};

export default function MyMoviesClient({
  initialWatched,
  initialWantToWatch,
  initialDropped,
  initialHidden,
  counts,
  userId,
  initialTab,
}: MyMoviesClientProps) {
  const [activeTab, setActiveTab] = useState<'watched' | 'wantToWatch' | 'dropped' | 'hidden'>(
    initialTab || 'watched'
  );
  const [filmFilters, setFilmFilters] = useState<FilmFilterState>({
    showMovies: true,
    showTv: true,
    showAnime: true,
  });
  const [sort, setSort] = useState<SortState>({
    sortBy: 'rating',
    sortOrder: 'desc',
  });
  const [additionalFilters, setAdditionalFilters] = useState<AdditionalFilters>({
    minRating: 0,
    maxRating: 10,
    yearFrom: '',
    yearTo: '',
  });
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);

  // Use our optimized hook for infinite query
  const moviesQuery = useMyMovies(
    userId,
    activeTab,
    filmFilters,
    sort,
    additionalFilters,
    selectedGenres
  );

  // Loading states
  const isLoading = moviesQuery.isLoading;
  const isFetchingNextPage = moviesQuery.isFetchingNextPage;
  const hasNextPage = moviesQuery.hasNextPage ?? false;
  const movies = moviesQuery.movies;

  // Batch data management - placed after movies is defined
  const batchDataRef = useRef<Record<string, any>>({});
  const { data: batchData, invalidate: invalidateBatchData } = useBatchData(
    movies as Media[],
    batchDataRef.current
  );

  // Update batch data ref
  useEffect(() => {
    if (batchData) {
      batchDataRef.current = { ...batchDataRef.current, ...batchData };
    }
  }, [batchData]);

  const [currentCounts, setCurrentCounts] = useState(counts);
  const [availableGenres, setAvailableGenres] = useState<{ id: number; name: string }[]>([]);
  const [userTags, setUserTags] = useState<Array<{ id: string; name: string; count: number }>>([]);

  // Sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(movies.length);
  const isFetchingRef = useRef(false);

  // Scroll position restoration
  useEffect(() => {
    if (movies.length > previousCountRef.current) {
      // New items were added
    }
    previousCountRef.current = movies.length;
    // Reset fetching flag when movies change
    isFetchingRef.current = false;
  }, [movies.length]);

  // Fetch next page handler with safeguards
  const handleFetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
      isFetchingRef.current = true;
      moviesQuery.fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, moviesQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
          isFetchingRef.current = true;
          moviesQuery.fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '400px',
        threshold: 0.1,
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasNextPage, isFetchingNextPage, moviesQuery]);

  // Состояние для popup о просмотре фильма
  const [showWatchedPopup, setShowWatchedPopup] = useState(false);
  const [acceptedRecommendation, setAcceptedRecommendation] = useState<AcceptedRecommendation | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Проверка: пришел ли пользователь со страницы рекомендаций
  useEffect(() => {
    const recommendationData = sessionStorage.getItem('recommendationAccepted');
    if (recommendationData) {
      try {
        const data = JSON.parse(recommendationData) as AcceptedRecommendation;
        setAcceptedRecommendation(data);
        setShowWatchedPopup(true);
        sessionStorage.removeItem('recommendationAccepted');
      } catch (e) {
        console.error('Error parsing recommendation data:', e);
      }
    }
  }, []);

  // Логирование действия
  const logRecommendationAction = async (action: 'accepted_no' | 'accepted_yes') => {
    if (!acceptedRecommendation?.logId) return;

    try {
      await fetch(`/api/recommendations/${acceptedRecommendation.logId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (err) {
      console.error('Error logging recommendation action:', err);
    }
  };

  // Обработчик "Нет" - закрыть popup
  const handleWatchedNo = async () => {
    await logRecommendationAction('accepted_no');
    setShowWatchedPopup(false);
    setAcceptedRecommendation(null);
  };

  // Обработчик "Да" - открыть RatingModal
  const handleWatchedYes = async () => {
    setShowWatchedPopup(false);
    setShowRatingModal(true);
  };

  // Обработчик сохранения оценки
  const handleRatingSave = async (rating: number, _date: string) => {
    if (!acceptedRecommendation) return;

    const newStatus = acceptedRecommendation.title.includes('(пересмотр)')
      ? 'Просмотрено'
      : 'Пересмотрено';

    try {
      await updateWatchStatus(
        userId,
        acceptedRecommendation.tmdbId,
        acceptedRecommendation.mediaType,
        newStatus,
        rating,
        acceptedRecommendation.logId
      );

      await logRecommendationAction('accepted_yes');

      const newCounts = await getMoviesCounts(userId);
      setCurrentCounts(newCounts);

      // Refresh current tab data
      moviesQuery.refetch();
      invalidateBatchData();
    } catch (error) {
      console.error('Error updating watch status:', error);
    } finally {
      setShowRatingModal(false);
      setAcceptedRecommendation(null);
    }
  };

  // Загружаем доступные жанры и теги
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { getUserGenres } = await import('./actions');
        const genres = await getUserGenres(userId);
        setAvailableGenres(genres);
      } catch (error) {
        console.error('Error fetching user genres:', error);
      }
    };

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
        console.error('Error fetching user tags:', error);
      }
    };

    fetchGenres();
    fetchUserTags();
  }, [userId]);

  const isRestoreView = activeTab === 'hidden';
  const showLoadingSpinner = isFetchingNextPage;

  const tabCounts = {
    watched: currentCounts.watched,
    wantToWatch: currentCounts.wantToWatch,
    dropped: currentCounts.dropped,
    hidden: currentCounts.hidden,
  };

  const tabs = [
    { id: 'watched' as const, label: 'Просмотрено', count: tabCounts.watched },
    { id: 'wantToWatch' as const, label: 'Хочу посмотреть', count: tabCounts.wantToWatch },
    { id: 'dropped' as const, label: 'Брошено', count: tabCounts.dropped },
    {
      id: 'hidden' as const,
      label: 'Скрытые',
      count: tabCounts.hidden,
      className: 'text-gray-500 hover:text-gray-400'
    },
  ];

  // Handle tab change
  const handleTabChange = (newTab: typeof activeTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
  };

  return (
    <div className="min-h-screen bg-gray-950 py-3 sm:py-4">
      {/* Popup: Вы просмотрели фильм? */}
      {showWatchedPopup && acceptedRecommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white text-center mb-4">
              Вы просмотрели фильм
            </h3>
            <p className="text-gray-300 text-center mb-6">
              {acceptedRecommendation.title} ({acceptedRecommendation.year})?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleWatchedNo}
                className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition"
              >
                Нет
              </button>
              <button
                onClick={handleWatchedYes}
                className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-500 transition"
              >
                Да
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RatingModal */}
      {acceptedRecommendation && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setAcceptedRecommendation(null);
          }}
          onSave={handleRatingSave}
          title={acceptedRecommendation.title}
          releaseDate={acceptedRecommendation.year}
          defaultRating={6}
          showWatchedDate={true}
        />
      )}

      <div className="container mx-auto px-2 sm:px-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Мои фильмы
        </h1>

        <FilmFilters
          onFiltersChange={setFilmFilters}
          onSortChange={setSort}
          availableGenres={availableGenres}
          userTags={userTags}
          onAdditionalFiltersChange={(filters, genres) => {
            setAdditionalFilters(filters);
            setSelectedGenres(genres);
          }}
        />

        <div className="flex flex-wrap gap-4 mt-3 mb-8 border-b border-gray-800 pb-2">
          {tabs.map((tab) => {
            let baseClasses = "pb-2 px-2 border-b-2 transition-colors relative cursor-pointer ";
            if (activeTab === tab.id) {
              baseClasses += "border-blue-500 text-white";
            } else {
              baseClasses += "border-transparent hover:border-gray-600 ";
              baseClasses += tab.className || "text-gray-400 hover:text-white";
            }

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={baseClasses}
              >
                <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                <span className="ml-2 text-xs sm:text-sm">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {isLoading && movies.length === 0 ? (
          <LoaderSkeleton variant="grid" text="Загрузка фильмов..." skeletonCount={12} />
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {movies.map((movie, index) => {
                const key = `${movie.id}-${movie.media_type}`;
                const batch = batchDataRef.current[key] || {};
                return (
                  <div key={`${movie.id}-${index}`} className="p-1">
                    <MovieCardErrorBoundary>
                      <MovieCard
                        movie={movie as Media}
                        restoreView={isRestoreView}
                        showRatingBadge
                        priority={index < 6}
                        initialStatus={movie.statusName ? STATUS_MAP[movie.statusName] || null : null}
                        initialIsBlacklisted={movie.isBlacklisted}
                        initialUserRating={movie.userRating}
                        initialAverageRating={movie.averageRating ?? batch.averageRating}
                        initialRatingCount={movie.ratingCount ?? batch.ratingCount}
                      />
                    </MovieCardErrorBoundary>
                  </div>
                );
              })}
            </div>

            <div ref={sentinelRef} className="h-4" />

            {/* Кнопка "Ещё" */}
            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleFetchNextPage}
                  disabled={isFetchingNextPage}
                  className="px-6 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                      Загрузка...
                    </>
                  ) : (
                    'Ещё...'
                  )}
                </button>
              </div>
            )}

            {showLoadingSpinner && !hasNextPage && (
              <div className="flex justify-center mt-6">
                <Loader size="small" />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              В этом списке пока ничего нет
            </p>
            <p className="text-gray-500 text-sm mt-4">
              {isRestoreView ? 'Добавляйте фильмы в черный список на главной странице' : 'Добавляйте фильмы с главной страницы или поиска'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
