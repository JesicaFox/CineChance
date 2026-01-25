// src/hooks/useMyMovies.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Media } from '@/lib/tmdb';
import { MovieWithStatus } from '@/app/my-movies/actions';

export interface MyMoviesFilterState {
  showMovies: boolean;
  showTv: boolean;
  showAnime: boolean;
}

export interface MyMoviesSortState {
  sortBy: 'popularity' | 'rating' | 'date' | 'savedDate';
  sortOrder: 'desc' | 'asc';
}

export interface MyMoviesAdditionalFilters {
  minRating: number;
  maxRating: number;
  yearFrom: string;
  yearTo: string;
  selectedTags?: string[];
}

interface MyMoviesResults {
  movies: MovieWithStatus[];
  hasMore: boolean;
  totalCount: number;
}

const ITEMS_PER_PAGE = 20;

const buildFetchParams = (
  statusName: string | string[] | null,
  includeHidden: boolean,
  page: number,
  sortBy: string,
  sortOrder: string,
  filters: MyMoviesFilterState,
  additionalFilters: MyMoviesAdditionalFilters,
  selectedGenres: number[]
) => {
  const params: Record<string, any> = {
    page,
    limit: ITEMS_PER_PAGE,
    sortBy,
    sortOrder,
  };

  if (statusName) {
    params.statusName = Array.isArray(statusName) ? statusName.join(',') : statusName;
  }
  if (includeHidden) {
    params.includeHidden = 'true';
  }

  // Media type filters
  const types: string[] = [];
  if (filters.showMovies) types.push('movie');
  if (filters.showTv) types.push('tv');
  if (filters.showAnime) types.push('anime');
  if (types.length > 0 && types.length < 3) {
    params.types = types.join(',');
  }

  // Additional filters
  if (additionalFilters.yearFrom) params.yearFrom = additionalFilters.yearFrom;
  if (additionalFilters.yearTo) params.yearTo = additionalFilters.yearTo;
  if (additionalFilters.minRating > 0) params.minRating = additionalFilters.minRating;
  if (additionalFilters.maxRating < 10) params.maxRating = additionalFilters.maxRating;
  if (selectedGenres.length > 0) params.genres = selectedGenres.join(',');
  if (additionalFilters.selectedTags && additionalFilters.selectedTags.length > 0) {
    params.tags = additionalFilters.selectedTags.join(',');
  }

  return params;
};

const fetchMyMovies = async (
  statusName: string | string[] | null,
  includeHidden: boolean,
  pageParam: number,
  sortBy: string,
  sortOrder: string,
  filters: MyMoviesFilterState,
  additionalFilters: MyMoviesAdditionalFilters,
  selectedGenres: number[]
): Promise<MyMoviesResults> => {
  const params = buildFetchParams(
    statusName,
    includeHidden,
    pageParam,
    sortBy,
    sortOrder,
    filters,
    additionalFilters,
    selectedGenres
  );

  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/my-movies?${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch movies');
  }

  return response.json();
};

export const useMyMovies = (
  userId: string,
  initialTab: 'watched' | 'wantToWatch' | 'dropped' | 'hidden',
  filters: MyMoviesFilterState,
  sort: MyMoviesSortState,
  additionalFilters: MyMoviesAdditionalFilters,
  selectedGenres: number[]
) => {
  const queryClient = useQueryClient();

  // Determine status name based on tab
  const statusName = initialTab === 'watched' 
    ? ['Просмотрено', 'Пересмотрено']
    : initialTab === 'wantToWatch' 
      ? 'Хочу посмотреть'
      : initialTab === 'dropped'
        ? 'Брошено'
        : null;
  
  const includeHidden = initialTab === 'hidden';

  const query = useInfiniteQuery({
    queryKey: ['myMovies', userId, initialTab, sort, filters, additionalFilters, selectedGenres] as const,
    queryFn: ({ pageParam = 1 }) => fetchMyMovies(
      statusName,
      includeHidden,
      pageParam,
      sort.sortBy,
      sort.sortOrder,
      filters,
      additionalFilters,
      selectedGenres
    ),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      if (lastPage.movies.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000, // 30 seconds - shorter for more fresh data
    gcTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const movies = query.data?.pages.flatMap(page => page.movies) ?? [];

  const totalCount = query.data?.pages[0]?.totalCount ?? 0;

  return {
    ...query,
    movies,
    totalCount,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['myMovies'] });
    },
  };
};
