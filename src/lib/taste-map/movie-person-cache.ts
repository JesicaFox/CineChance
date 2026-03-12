import { prisma } from '@/lib/prisma';
import { getMediaCredits } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

interface SimplePerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
}

/**
 * Get movie person cache from DB or create it by fetching from TMDB.
 * Returns { topActors, topDirectors }.
 */
export async function getOrCreateMoviePersonCache(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<{
  topActors: SimplePerson[];
  topDirectors: SimplePerson[];
}> {
  // Try to get from DB
  const existing = await prisma.moviePersonCache.findUnique({
    where: { tmdbId_mediaType: { tmdbId, mediaType } },
  });

  // Fetch from TMDB
  const credits = await getMediaCredits(tmdbId, mediaType);

  if (!credits) {
    if (existing) {
      // Return existing even if incomplete, better than nothing
      return {
        topActors: existing.topActors as any,
        topDirectors: existing.topDirectors as any,
      };
    }
    // Save empty cache to avoid repeated attempts
    await prisma.moviePersonCache.create({
      data: {
        tmdbId,
        mediaType,
        topActors: [],
        topDirectors: [],
      },
    });
    logger.warn('Failed to fetch credits, created empty cache', { tmdbId, mediaType });
    return { topActors: [], topDirectors: [] };
  }

  if (existing) {
    // Update existing record with fresh data (including profile_path)
    await prisma.moviePersonCache.update({
      where: { tmdbId_mediaType: { tmdbId, mediaType } },
      data: {
        topActors: credits.topActors,
        topDirectors: credits.topDirectors,
        lastFetchedAt: new Date(),
      },
    });
    logger.debug('Updated movie person cache', { tmdbId, mediaType, actors: credits.topActors.length });
  } else {
    // Create new record
    await prisma.moviePersonCache.create({
      data: {
        tmdbId,
        mediaType,
        topActors: credits.topActors,
        topDirectors: credits.topDirectors,
      },
    });
    logger.debug('Created movie person cache', { tmdbId, mediaType, actors: credits.topActors.length });
  }

  return {
    topActors: credits.topActors,
    topDirectors: credits.topDirectors,
  };
}
