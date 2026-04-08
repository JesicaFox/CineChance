// src/lib/normalize-watchlist-genres.ts
/**
 * Normalizes genres for WatchList entries
 * Splits composite TV genres into base genres before saving to database
 *
 * Used when:
 * - Adding a new movie/show to watchlist
 * - Updating existing watchlist entry
 * - Importing from TMDB API
 */

import { normalizeGenres } from './tmdb-genres';

interface Genre {
  id: number;
  name: string;
}

/**
 * Process genres before saving to WatchList
 * - Normalizes composite genres (e.g., "Action & Adventure" → ["Action", "Adventure"])
 * - Handles both genre objects and genre IDs
 * - Returns normalized genre array
 *
 * @param input Genres from TMDB API - can be array of objects or IDs
 * @returns Normalized array of base genre objects, or null if input is null/undefined
 */
export function normalizeWatchListGenres(
  input: any[] | null | undefined
): Array<{ id: number; name: string }> | null {
  if (!input || !Array.isArray(input)) {
    return null;
  }

  if (input.length === 0) {
    return [];
  }

  // Convert genre IDs to objects if needed
  let genreObjects: Genre[] = [];

  for (const item of input) {
    if (typeof item === 'object' && item.id && item.name) {
      // Already a genre object
      genreObjects.push(item);
    }
    // Skip other formats - they're not valid
  }

  if (genreObjects.length === 0) {
    return [];
  }

  // Normalize using the tmdb-genres utility
  return normalizeGenres(genreObjects);
}

/**
 * Prepare genres for database storage
 * - Normalizes the genres
 * - Returns JSON-serializable format
 *
 * Usage in watchlist API:
 * ```
 * const normalizedGenres = prepareGenresForDB(details.genres);
 * await prisma.watchList.create({
 *   data: {
 *     // ... other fields
 *     genres: normalizedGenres,
 *   }
 * });
 * ```
 */
export function prepareGenresForDB(genres: any): any {
  const normalized = normalizeWatchListGenres(genres);
  return normalized ? JSON.parse(JSON.stringify(normalized)) : null;
}
