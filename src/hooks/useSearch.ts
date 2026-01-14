// src/hooks/useSearch.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Media } from '@/lib/tmdb';

interface SearchParams {
  q: string;
  type?: string;
  yearFrom?: string;
  yearTo?: string;
  quickYear?: string;
  genres?: string;
  ratingFrom?: number;
  ratingTo?: number;
  sortBy?: string;
  sortOrder?: string;
  listStatus?: string;
}

interface SearchResults {
  results: Media[];
  totalPages: number;
  totalResults: number;
}

const ITEMS_PER_PAGE = 20;
const INITIAL_ITEMS = 30;

const buildSearchParams = (params: SearchParams, page: number) => {
  const searchParams = new URLSearchParams({
    q: params.q,
    page: String(page),
    limit: page === 1 ? String(INITIAL_ITEMS) : String(ITEMS_PER_PAGE),
  });

  if (params.type && params.type !== 'all') {
    searchParams.set('type', params.type);
  }
  if (params.yearFrom) searchParams.set('yearFrom', params.yearFrom);
  if (params.yearTo) searchParams.set('yearTo', params.yearTo);
  if (params.quickYear) searchParams.set('quickYear', params.quickYear);
  if (params.genres) searchParams.set('genres', params.genres);
  if ((params.ratingFrom ?? 0) > 0) searchParams.set('ratingFrom', String(params.ratingFrom));
  if ((params.ratingTo ?? 10) < 10) searchParams.set('ratingTo', String(params.ratingTo));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.listStatus) searchParams.set('listStatus', params.listStatus);

  return searchParams.toString();
};

const fetchSearchResults = async ({ pageParam = 1, queryKey }: { pageParam: number; queryKey: readonly [string, SearchParams] }): Promise<SearchResults> => {
  const [_, params] = queryKey;
  
  if (!params.q && !params.type && !params.yearFrom && !params.yearTo && !params.genres && (params.ratingFrom ?? 0) === 0 && (params.ratingTo ?? 10) === 10 && params.listStatus === 'all') {
    return { results: [], totalPages: 1, totalResults: 0 };
  }

  const queryString = buildSearchParams(params, pageParam);
  const response = await fetch(`/api/search?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Search failed');
  }
  
  return response.json();
};

export const useSearch = (params: SearchParams, blacklistedIds: number[]) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['search', params] as const,
    queryFn: fetchSearchResults,
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      if (lastPage.results.length === 0) return undefined;
      if (currentPage >= lastPage.totalPages) return undefined;
      return currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and deduplicate results from all pages
  const filteredResults = query.data?.pages.flatMap(page => {
    if (!page.results) return [];
    
    const blacklistedSet = new Set(blacklistedIds);
    const seen = new Set<string>();
    
    return page.results.filter((item: Media) => {
      const key = `${item.media_type}_${item.id}`;
      // Filter out blacklisted items, movies with no rating, and duplicates
      if (seen.has(key) || blacklistedSet.has(item.id) || (item.vote_average ?? 0) <= 0) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }) ?? [];

  const totalResults = query.data?.pages[0]?.totalResults ?? 0;

  // Prefetch next page when user hovers on load more button
  const prefetchNextPage = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  };

  return {
    ...query,
    results: filteredResults,
    totalResults,
    prefetchNextPage,
    // Refetch with new filters
    refetchWithFilters: (newParams: SearchParams) => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  };
};
