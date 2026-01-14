// src/app/search/SearchClient.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MovieCard from '../components/MovieCard';
import Loader from '../components/Loader';
import { Media } from '@/lib/tmdb';
import SearchFilters, { FilterState } from './SearchFilters';
import { useSearch, useBatchData, useInvalidateBatchData } from '@/hooks';

interface SearchClientProps {
  initialQuery: string;
  blacklistedIds: number[];
}

export default function SearchClient({ initialQuery, blacklistedIds }: SearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Memoized search params - recreates when filters change
  const searchParamsMemo = useMemo(() => {
    const filters = currentFilters;
    const type = filters
      ? (filters.showMovies ? 'movie' : '') +
        (filters.showTv ? ',tv' : '') +
        (filters.showAnime ? ',anime' : '')
          .split(',')
          .filter(Boolean)
          .join(',') || 'all'
      : 'all';

    const genresString = filters?.genres && filters.genres.length > 0 
      ? filters.genres.join(',') 
      : undefined;

    return {
      q: initialQuery,
      type: type === 'all' ? undefined : type,
      yearFrom: filters?.yearFrom,
      yearTo: filters?.yearTo,
      quickYear: filters?.quickYear,
      genres: genresString,
      ratingFrom: filters?.ratingFrom ?? 0,
      ratingTo: filters?.ratingTo ?? 10,
      sortBy: filters?.sortBy,
      sortOrder: filters?.sortOrder,
      listStatus: filters?.listStatus,
    };
  }, [initialQuery, currentFilters]);

  // Use React Query for search
  const searchQuery = useSearch(searchParamsMemo, blacklistedIds);
  
  // Invalidate batch data when search results change
  const invalidateBatchData = useInvalidateBatchData();
  useEffect(() => {
    if (searchQuery.data) {
      invalidateBatchData();
    }
  }, [searchQuery.data, invalidateBatchData]);

  // Use React Query for batch data
  const batchQuery = useBatchData(searchQuery.results);

  // Handle filter changes
  const handleFiltersChange = useCallback((filters: FilterState) => {
    setCurrentFilters(filters);
    // The useSearch hook will automatically refetch when buildSearchParams changes
  }, []);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine loading state
  const isLoading = searchQuery.isLoading || searchQuery.isFetching;
  const isLoadingMore = searchQuery.isFetchingNextPage;

  if (!initialQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Введите запрос в поисковую строку сверху</p>
      </div>
    );
  }

  return (
    <>
      <SearchFilters 
        onFiltersChange={handleFiltersChange} 
        totalResults={searchQuery.totalResults} 
      />

      {isLoading ? (
        <Loader text="Загрузка..." />
      ) : searchQuery.results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {searchQuery.results.map((item, index) => {
              const key = `${item.id}-${item.media_type}`;
              const batch = batchQuery.data?.[key] || {};
              
              return (
                <div
                  key={`${item.media_type}_${item.id}`}
                  className="w-full min-w-0 p-1"
                >
                  <MovieCard 
                    movie={item} 
                    priority={index < 6}
                    initialStatus={batch.status as 'want' | 'watched' | 'dropped' | 'rewatched' | null | undefined}
                    initialIsBlacklisted={batch.isBlacklisted}
                    initialUserRating={batch.userRating}
                    initialWatchCount={batch.watchCount}
                    initialAverageRating={batch.averageRating}
                    initialRatingCount={batch.ratingCount}
                  />
                </div>
              );
            })}
          </div>

          {/* Кнопка "Ещё" */}
          {searchQuery.hasNextPage && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => searchQuery.fetchNextPage()}
                disabled={isLoadingMore}
                className="px-6 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoadingMore ? (
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

          {/* Кнопка "Наверх" */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors z-50"
              aria-label="Наверх"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-2">Ничего не найдено</p>
          <p className="text-gray-500 text-xs">Попробуйте другой запрос</p>
        </div>
      )}
    </>
  );
}
