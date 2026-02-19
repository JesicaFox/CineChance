// src/hooks/useBatchData.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { Media } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

interface BatchData {
  [key: string]: {
    status?: string;
    isBlacklisted?: boolean;
    userRating?: number;
    watchCount?: number;
    averageRating?: number;
    ratingCount?: number;
  };
}

const BATCH_SIZE = 10;

const fetchBatchData = async (movies: Media[]): Promise<BatchData> => {
  if (movies.length === 0) return {};

  try {
    const chunks: Media[][] = [];
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      chunks.push(movies.slice(i, i + BATCH_SIZE));
    }

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await fetch('/api/movies/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movies: chunk.map(m => ({ tmdbId: m.id, mediaType: m.media_type })) }),
        });

        if (!response.ok) {
          return {};
        }

        return response.json();
      })
    );

    const mergedResult: BatchData = {};
    for (const result of results) {
      Object.assign(mergedResult, result);
    }

    return mergedResult;
  } catch (error) {
    logger.warn('Batch fetch error', { error: error instanceof Error ? error.message : String(error) });
    return {};
  }
};

export const useBatchData = (movies: Media[], existingData: BatchData = {}) => {
  const queryClient = useQueryClient();

  // Get IDs of movies we already have data for
  const existingIds = useMemo(() => {
    return new Set(Object.keys(existingData));
  }, [existingData]);

  // Filter to only movies we don't have data for
  const newMovies = useMemo(() => {
    return movies.filter(m => !existingIds.has(`${m.media_type}_${m.id}`));
  }, [movies, existingIds]);

  // Query only for new movies
  const query = useQuery({
    queryKey: ['batchData', newMovies.map(m => `${m.media_type}_${m.id}`).sort().join(',')],
    queryFn: () => fetchBatchData(newMovies),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: newMovies.length > 0,
    refetchOnWindowFocus: false,
  });

  // Combine existing and new data
  const data = useMemo(() => {
    return { ...existingData, ...query.data };
  }, [existingData, query.data]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['batchData'] });
  }, [queryClient]);

  return { data, isLoading: query.isLoading, invalidate };
};
