// src/hooks/useBatchData.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Media } from '@/lib/tmdb';

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

const BATCH_SIZE = 10; // Reduced batch size for better performance

const fetchBatchData = async (movies: Media[]): Promise<BatchData> => {
  if (movies.length === 0) return {};

  try {
    // Split movies into chunks
    const chunks: Media[][] = [];
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      chunks.push(movies.slice(i, i + BATCH_SIZE));
    }

    // Fetch all chunks in parallel
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

    // Merge all results
    const mergedResult: BatchData = {};
    for (const result of results) {
      Object.assign(mergedResult, result);
    }

    return mergedResult;
  } catch (error) {
    console.warn('Batch fetch error:', error);
    return {};
  }
};

export const useBatchData = (movies: Media[]) => {
  // Create stable key based on movie IDs
  const movieIds = movies.map(m => `${m.media_type}_${m.id}`).sort().join(',');
  const queryKey = ['batchData', movieIds];

  return useQuery({
    queryKey,
    queryFn: () => fetchBatchData(movies),
    staleTime: 60 * 1000, // 1 minute - cache longer to avoid refetches
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: movies.length > 0,
  });
};

// Hook to invalidate batch data when movie status changes
export const useInvalidateBatchData = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['batchData'] });
  };
};
