// src/lib/tmdb-genres.ts
/**
 * TMDB Genres Reference and Normalization
 *
 * TMDB API uses 19 base genres + combined genres (esp. for TV).
 * This file provides normalization utilities to split combined genres into base genres.
 */

/**
 * Official TMDB base genres (19 total)
 * Used for both movies and TV shows
 */
export const TMDB_BASE_GENRES = {
  // Movies
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',

  // Additional TV genres
  10765: 'Sci-Fi & Fantasy', // COMPOSITE - should map to 878 + 14
  10759: 'Action & Adventure', // COMPOSITE - should map to 28 + 12
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10766: 'Soap',
  10767: 'Talk Show',
  10768: 'War & Politics', // COMPOSITE - should map to 10752 + ?
} as const;

export type TMDBGenreId = keyof typeof TMDB_BASE_GENRES;

/**
 * Mapping of composite/combined TV genre IDs to their base genre components
 * These are TV-specific genres that combine multiple base genres
 */
export const COMPOSITE_GENRE_MAPPING: Record<number, number[]> = {
  // TV Genres
  10759: [28, 12], // Action & Adventure → Action + Adventure
  10765: [878, 14], // Sci-Fi & Fantasy → Science Fiction + Fantasy
  10768: [10752, 37], // War & Politics → War + Western (closest approximation)
};

/**
 * Normalize genres by splitting composite genres into base genres
 * Removes duplicates and returns only base genre IDs
 *
 * @param genres Array of genre objects from TMDB API
 * @returns Normalized array of base genre objects
 */
export function normalizeGenres(
  genres: Array<{ id: number; name: string }>
): Array<{ id: number; name: string }> {
  const normalized = new Set<number>();

  for (const genre of genres) {
    if (COMPOSITE_GENRE_MAPPING[genre.id]) {
      // Split composite genre into base genres
      for (const baseId of COMPOSITE_GENRE_MAPPING[genre.id]) {
        normalized.add(baseId);
      }
    } else if (TMDB_BASE_GENRES[genre.id as TMDBGenreId]) {
      // Keep base genres as is
      normalized.add(genre.id);
    }
    // Ignore unknown genres
  }

  // Convert IDs back to genre objects
  return Array.from(normalized)
    .sort((a, b) => a - b)
    .map(id => ({
      id,
      name: TMDB_BASE_GENRES[id as TMDBGenreId] || `Unknown (${id})`,
    }));
}

/**
 * Get base genre info by ID
 */
export function getGenreInfo(id: number): { id: number; name: string } | null {
  const name = TMDB_BASE_GENRES[id as TMDBGenreId];
  if (!name) return null;

  return { id, name };
}

/**
 * Check if a genre ID is a composite/combined genre
 */
export function isCompositeGenre(id: number): boolean {
  return Boolean(COMPOSITE_GENRE_MAPPING[id]);
}

/**
 * Get all base genre IDs (19 total, excluding TV-specific composites)
 */
export function getBaseGenreIds(): number[] {
  return Object.keys(TMDB_BASE_GENRES)
    .map(Number)
    .filter(id => !COMPOSITE_GENRE_MAPPING[id])
    .sort((a, b) => a - b);
}

/**
 * Get all composite genre IDs
 */
export function getCompositeGenreIds(): number[] {
  return Object.keys(COMPOSITE_GENRE_MAPPING).map(Number);
}
