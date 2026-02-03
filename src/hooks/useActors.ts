// src/hooks/useActors.ts
'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export interface ActorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface ActorsResults {
  actors: ActorAchievement[];
  hasMore: boolean;
  total: number;
}

const ITEMS_PER_PAGE = 24;

const buildFetchParams = (
  offset: number,
  fullData: boolean
) => {
  const params: Record<string, any> = {
    limit: ITEMS_PER_PAGE,
    offset,
    fullData: fullData.toString(),
  };

  return params;
};

const fetchActors = async (
  offset: number,
  fullData: boolean
): Promise<ActorsResults> => {
  const params = buildFetchParams(offset, fullData);
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`/api/user/achiev_actors?${queryString}`);

  if (!response.ok) {
    throw new Error('Failed to fetch actors');
  }

  return response.json();
};

export const useActors = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['actors', userId] as const,
    queryFn: ({ pageParam = 0 }) => fetchActors(pageParam, true), // Всегда загружаем полные данные
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.reduce((acc, page) => acc + page.actors.length, 0);
      if (lastPage.actors.length === 0) return undefined;
      if (!lastPage.hasMore) return undefined;
      return currentOffset;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });

  // Flatten all pages into a single array
  const actors = query.data?.pages.flatMap(page => page.actors) ?? [];

  const totalCount = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    actors,
    totalCount,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    },
  };
};
