// src/app/search/SearchClient.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MovieList from './MovieList';
import SearchFilters, { FilterState } from './SearchFilters';
import { useSearch, useBatchData } from '@/hooks';
import { Media } from '@/lib/tmdb';
import { useSession } from 'next-auth/react';
import LoaderSkeleton from '@/app/components/LoaderSkeleton';
import { logger } from '@/lib/logger';
import { AppErrorBoundary } from '@/app/components/ErrorBoundary';
import { BlacklistProvider, useBlacklist } from '@/app/components/BlacklistContext';

interface SearchClientProps {
  initialQuery: string;
}

// Компонент который использует BlacklistContext
function SearchContent({ initialQuery }: { initialQuery: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  // Используем BlacklistContext для blacklist
  const { blacklistedIds: blacklistSet, isLoading: isBlacklistLoading } = useBlacklist();
  
  // Конвертируем Set в массив для useSearch
  const blacklistedIds = useMemo(() => 
    Array.from(blacklistSet), 
    [blacklistSet]
  );

  // Filter state
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState<FilterState | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Debounce фильтров - задержка 500ms перед отправкой
  useEffect(() => {
    if (!currentFilters) return;
    
    const timer = setTimeout(() => {
      setDebouncedFilters(currentFilters);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentFilters]);

  // Scroll tracking
  const scrollYRef = useRef(0);
  const batchDataRef = useRef<Record<string, unknown>>({});

  // Build search params
  const buildSearchParams = () => {
    const filters = debouncedFilters;
    
    let typeValue = 'all';
    if (filters) {
      const types: string[] = [];
      if (filters.showMovies) types.push('movie');
      if (filters.showTv) types.push('tv');
      if (filters.showAnime) types.push('anime');
      if (filters.showCartoon) types.push('cartoon');
      typeValue = types.length > 0 ? types.join(',') : 'all';
    }
    
    const genresString = filters?.genres && filters.genres.length > 0 
      ? filters.genres.join(',') 
      : '';

    return {
      q: initialQuery,
      type: typeValue !== 'all' ? typeValue : undefined,
      yearFrom: filters?.yearFrom,
      yearTo: filters?.yearTo,
      quickYear: filters?.quickYear,
      genres: genresString || undefined,
      ratingFrom: filters?.ratingFrom,
      ratingTo: filters?.ratingTo && filters.ratingTo < 10 ? filters.ratingTo : undefined,
      sortBy: filters?.sortBy,
      sortOrder: filters?.sortOrder,
      listStatus: filters?.listStatus && filters.listStatus !== 'all' ? filters.listStatus : undefined,
    };
  };

  // Search query
  const searchQuery = useSearch(buildSearchParams(), blacklistedIds);
  
  // Batch data - only for new movies
  const batchQuery = useBatchData(searchQuery.results, batchDataRef.current);

  // Update batch data ref
  useEffect(() => {
    if (batchQuery.data) {
      batchDataRef.current = { ...batchDataRef.current, ...batchQuery.data };
    }
  }, [batchQuery.data]);

  // Fetch next page handler
  const handleFetchNextPage = useCallback(() => {
    if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      scrollYRef.current = window.scrollY;
      searchQuery.fetchNextPage();
    }
  }, [searchQuery.hasNextPage, searchQuery.isFetchingNextPage, searchQuery.fetchNextPage]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Loading state
  const isLoading = searchQuery.isLoading || searchQuery.isFetching;

  if (!initialQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Введите запрос в поисковую строку сверху</p>
      </div>
    );
  }

  // Ждем загрузки blacklist перед показом результатов
  if (isBlacklistLoading) {
    return (
      <LoaderSkeleton variant="grid" text="Загрузка..." skeletonCount={12} />
    );
  }

  return (
    <AppErrorBoundary
      fallback={
        <div className="border-2 border-red-500/50 rounded-lg p-8 text-center">
          <p className="text-red-400 text-lg mb-4">Не удалось загрузить результаты поиска</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      }
    >
      <SearchFilters 
        onFiltersChange={setCurrentFilters}
        initialFilters={currentFilters ?? undefined}
        totalResults={searchQuery.totalResults} 
      />

      {isLoading && searchQuery.results.length === 0 ? (
        <LoaderSkeleton variant="grid" text="Поиск фильмов..." skeletonCount={12} />
      ) : searchQuery.isError ? (
        <div className="rounded-lg bg-red-900/20 border border-red-700/50 p-4 text-center mb-4">
          <p className="text-red-400 text-sm font-medium">⚠️ {searchQuery.error instanceof Error ? searchQuery.error.message : 'Ошибка при поиске'}</p>
          {searchQuery.error instanceof Error && searchQuery.error.message.includes('подождите') && (
            <p className="text-red-300 text-xs mt-2">Пожалуйста, дождитесь сброса лимита и повторите попытку.</p>
          )}
        </div>
      ) : searchQuery.results.length > 0 ? (
        <>
          <MovieList
            movies={searchQuery.results as Media[]}
            batchData={batchDataRef.current}
            hasNextPage={searchQuery.hasNextPage}
            isFetchingNextPage={searchQuery.isFetchingNextPage}
            onFetchNextPage={handleFetchNextPage}
            initialScrollY={scrollYRef.current}
            onScrollYChange={(y) => { scrollYRef.current = y; }}
          />

          {/* Кнопка "Наверх" */}
          {showScrollTop && (
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
    </AppErrorBoundary>
  );
}

// Главный экспорт с BlacklistProvider
export default function SearchClient({ initialQuery }: SearchClientProps) {
  return (
    <BlacklistProvider>
      <SearchContent initialQuery={initialQuery} />
    </BlacklistProvider>
  );
}
