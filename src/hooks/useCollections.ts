// src/hooks/useCollections.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export interface CollectionAchievement {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  added_movies: number;
  watched_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface CollectionsResults {
  collections: CollectionAchievement[];
  hasMore: boolean;
  total: number;
}

const ITEMS_PER_PAGE = 24;

const buildFetchParams = (
  offset: number
) => {
  const params: Record<string, any> = {
    limit: ITEMS_PER_PAGE,
    offset,
  };

  return params;
};

const fetchCollections = async (
  offset: number
): Promise<CollectionsResults> => {
  const params = buildFetchParams(offset);
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/user/achiev_collections?${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }

  return response.json();
};

export const useCollections = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['collections', userId] as const,
    queryFn: ({ pageParam = 0 }) => fetchCollections(pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.reduce((acc, page) => acc + page.collections.length, 0);
      if (lastPage.collections.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return currentOffset;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const collections = query.data?.pages.flatMap(page => page.collections) ?? [];

  const totalCount = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    collections,
    totalCount,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  };
};
