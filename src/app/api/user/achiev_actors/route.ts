import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { withCache } from '@/lib/redis';
import { logger } from '@/lib/logger';
import type { MovieDetails, TMDbMediaBase, TMDbGenre, TMDbPersonCastCredit, TMDbPersonCredits } from '@/lib/types/tmdb';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Cache for actor credits from TMDB
const actorCreditsCache = new Map<number, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 86400000; // 24 hours

async function fetchMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<MovieDetails | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    logger.warn('fetchMediaDetails: TMDB_API_KEY not configured', { tmdbId, mediaType });
    return null;
  }
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5sec timeout per request
    
    const res = await fetch(url, { 
      next: { revalidate: 86400 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      logger.warn('fetchMediaDetails failed', { tmdbId, mediaType, status: res.status });
      return null;
    }
    return await res.json() as MovieDetails;
  } catch (error) {
    logger.error('fetchMediaDetails error', {
      error: error instanceof Error ? error.message : String(error),
      tmdbId,
      mediaType,
    });
    return null;
  }
}

function isAnime(movie: TMDbMediaBase): boolean {
  const hasAnimeGenre = movie.genres?.some((g: TMDbGenre) => g.id === 16) ?? false;
  const isJapanese = movie.original_language === 'ja';
  return hasAnimeGenre && isJapanese;
}

function isCartoon(movie: TMDbMediaBase): boolean {
  const hasAnimationGenre = movie.genres?.some((g: TMDbGenre) => g.id === 16) ?? false;
  const isNotJapanese = movie.original_language !== 'ja';
  return hasAnimationGenre && isNotJapanese;
}

function calculateActorScore(actor: {
  average_rating: number | null;
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
}): number {
  const baseRating = actor.average_rating || 0;
  const qualityBonus = Math.max(0, Math.min(10, 
    baseRating + (actor.rewatched_movies * 0.2) - (actor.dropped_movies * 0.3)
  ));
  const progressBonus = actor.total_movies > 0 
    ? Math.log(actor.total_movies + 1) * (actor.progress_percent / 100)
    : 0;
  const volumeBonus = actor.total_movies > 0 
    ? Math.log(actor.total_movies + 1) / Math.log(200)
    : 0;
  const watchedCountBonus = actor.watched_movies > 0
    ? Math.log(actor.watched_movies + 1) / Math.log(50)
    : 0;
  
  return (qualityBonus * 0.35) + (progressBonus * 0.25) + (volumeBonus * 0.15) + (watchedCountBonus * 0.15);
}

async function fetchMovieCredits(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<{ cast: Array<{ id: number; name: string; profile_path: string | null; character: string }> } | null> {
  if (!TMDB_API_KEY) {
    logger.warn('fetchMovieCredits: TMDB_API_KEY not configured', { tmdbId, mediaType });
    return null;
  }
  
  try {
    const url = new URL(`${BASE_URL}/${mediaType}/${tmdbId}/credits`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'ru-RU');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5sec timeout

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: [`${mediaType}-credits`] },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('fetchMovieCredits failed', { tmdbId, mediaType, status: response.status });
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('fetchMovieCredits error', {
      error: error instanceof Error ? error.message : String(error),
      tmdbId,
      mediaType,
    });
    return null;
  }
}

async function fetchPersonCredits(actorId: number): Promise<TMDbPersonCredits | null> {
  const cached = actorCreditsCache.get(actorId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    logger.debug('fetchPersonCredits: using cache', { actorId });
    return cached.data as Awaited<ReturnType<typeof fetchPersonCredits>>;
  }

  if (!TMDB_API_KEY) {
    logger.warn('fetchPersonCredits: TMDB_API_KEY not configured', { actorId });
    return null;
  }

  try {
    const url = new URL(`${BASE_URL}/person/${actorId}/combined_credits`);
    url.searchParams.append('api_key', TMDB_API_KEY);
    url.searchParams.append('language', 'ru-RU');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5sec timeout

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['person-credits'] },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn('fetchPersonCredits failed', { actorId, status: response.status });
      return null;
    }

    const data = await response.json();
    actorCreditsCache.set(actorId, { data, timestamp: now });
    logger.debug('fetchPersonCredits success', { actorId, castCount: (data.cast || []).length });
    return data as Awaited<ReturnType<typeof fetchPersonCredits>>;
  } catch (error) {
    logger.error('fetchPersonCredits error', {
      error: error instanceof Error ? error.message : String(error),
      actorId,
    });
    return null;
  }
}

type ActorEntry = {
  id: number;
  name: string;
  profile_path: string | null;
  watched_ids: Set<number>;
  rewatched_ids: Set<number>;
  dropped_ids: Set<number>;
  ratings_map: Map<number, number>; // tmdbId -> userRating
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
};

export async function GET(request: Request) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется аутентификация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || userId;
    
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const singleLoad = searchParams.get('singleLoad') === 'true';

    logger.info('AchievActorsAPI request', { userId: targetUserId, limit, offset, singleLoad });

    if (!TMDB_API_KEY) {
      logger.error('TMDB_API_KEY not configured', { context: 'AchievActorsAPI' });
      return NextResponse.json(
        { error: 'TMDB API not configured' },
        { status: 500 }
      );
    }

    const cacheKey = `user:${targetUserId}:achiev_actors:${limit}:${offset}:${singleLoad}`;

    const fetchActors = async () => {
      const fetchStartTime = Date.now();
      logger.info('fetchActors started', { userId: targetUserId });

      // Step 1: Get user's watched/rewatched/dropped movies
      const dbStartTime = Date.now();
      const [watchedMovies, rewatchedMovies, droppedMovies] = await Promise.all([
        prisma.watchList.findMany({
          where: {
            userId: targetUserId,
            statusId: MOVIE_STATUS_IDS.WATCHED,
            mediaType: { in: ['movie', 'tv'] },
          },
          select: {
            tmdbId: true,
            mediaType: true,
            userRating: true,
          },
        }),
        prisma.watchList.findMany({
          where: {
            userId: targetUserId,
            statusId: MOVIE_STATUS_IDS.REWATCHED,
            mediaType: { in: ['movie', 'tv'] },
          },
          select: {
            tmdbId: true,
            mediaType: true,
            userRating: true,
          },
        }),
        prisma.watchList.findMany({
          where: {
            userId: targetUserId,
            statusId: MOVIE_STATUS_IDS.DROPPED,
            mediaType: { in: ['movie', 'tv'] },
          },
          select: {
            tmdbId: true,
            mediaType: true,
            userRating: true,
          },
        }),
      ]);

      logger.info('Database queries completed', {
        userId: targetUserId,
        watched: watchedMovies.length,
        rewatched: rewatchedMovies.length,
        dropped: droppedMovies.length,
        duration: Date.now() - dbStartTime,
      });

      if (watchedMovies.length === 0 && rewatchedMovies.length === 0) {
        return { actors: [], hasMore: false, total: 0 };
      }

      // Step 2: Build actor map from user's watched movies
      const actorMap = new Map<number, ActorEntry>();

      const BATCH_SIZE = 10;
      
      // Process watched movies
      for (let i = 0; i < watchedMovies.length; i += BATCH_SIZE) {
        const batch = watchedMovies.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (movie) => {
            const credits = await fetchMovieCredits(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
            return { credits, userRating: movie.userRating, tmdbId: movie.tmdbId };
          })
        );

        for (const { credits, userRating, tmdbId } of results) {
          if (credits?.cast) {
            const topActors = credits.cast.slice(0, 10); // Top 10 from credits
            
            for (const actor of topActors) {
              if (!actorMap.has(actor.id)) {
                actorMap.set(actor.id, {
                  id: actor.id,
                  name: actor.name,
                  profile_path: actor.profile_path,
                  watched_ids: new Set(),
                  rewatched_ids: new Set(),
                  dropped_ids: new Set(),
                  ratings_map: new Map(),
                  watched_movies: 0,
                  rewatched_movies: 0,
                  dropped_movies: 0,
                  total_movies: 0,
                  progress_percent: 0,
                  average_rating: null,
                });
              }
              
              const actorEntry = actorMap.get(actor.id)!;
              actorEntry.watched_ids.add(tmdbId);
              if (userRating !== null && userRating !== undefined) {
                actorEntry.ratings_map.set(tmdbId, userRating);
              }
            }
          }
        }

        if (i + BATCH_SIZE < watchedMovies.length) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Process rewatched movies
      for (let i = 0; i < rewatchedMovies.length; i += BATCH_SIZE) {
        const batch = rewatchedMovies.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (movie) => {
            const credits = await fetchMovieCredits(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
            return { credits, userRating: movie.userRating, tmdbId: movie.tmdbId };
          })
        );

        for (const { credits, userRating, tmdbId } of results) {
          if (credits?.cast) {
            for (const actor of credits.cast) {
              if (actorMap.has(actor.id)) {
                const actorEntry = actorMap.get(actor.id)!;
                actorEntry.rewatched_ids.add(tmdbId);
                if (userRating !== null && userRating !== undefined) {
                  actorEntry.ratings_map.set(tmdbId, userRating);
                }
              }
            }
          }
        }

        if (i + BATCH_SIZE < rewatchedMovies.length) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Process dropped movies
      for (let i = 0; i < droppedMovies.length; i += BATCH_SIZE) {
        const batch = droppedMovies.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (movie) => {
            const credits = await fetchMovieCredits(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
            return { credits, tmdbId: movie.tmdbId };
          })
        );

        for (const { credits, tmdbId } of results) {
          if (credits?.cast) {
            for (const actor of credits.cast) {
              if (actorMap.has(actor.id)) {
                actorMap.get(actor.id)!.dropped_ids.add(tmdbId);
              }
            }
          }
        }

        if (i + BATCH_SIZE < droppedMovies.length) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Step 3: Sort actors by watched count
      const allActors = Array.from(actorMap.entries())
        .sort((a, b) => (b[1].watched_ids.size + b[1].rewatched_ids.size) - (a[1].watched_ids.size + a[1].rewatched_ids.size));
      
      // Step 4: Get full filmography for top actors
      const baseActorsData = allActors.map(([actorId, actorData]) => {
        const watched = actorData.watched_ids.size;
        const rewatched = actorData.rewatched_ids.size;
        const dropped = actorData.dropped_ids.size;
        
        // Calculate weighted average rating
        const ratings = Array.from(actorData.ratings_map.values());
        const average_rating = ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : null;

        return {
          id: actorId,
          name: actorData.name,
          profile_path: actorData.profile_path,
          watched_movies: watched,
          rewatched_movies: rewatched,
          dropped_movies: dropped,
          total_movies: 0,
          progress_percent: 0,
          average_rating,
        };
      });

      if (singleLoad) {
        // For single load, fetch full filmography for top N actors
        const maxActorsToProcess = Math.min(baseActorsData.length, limit);
        const actorsToProcess = baseActorsData.slice(0, maxActorsToProcess);
        
        logger.info('singleLoad: processing actors', { count: actorsToProcess.length });
        
        const batchSize = 5; // Параллельная обработка по 5 актеров
        const achievementsPromises: Promise<ActorEntry[]>[] = [];
        
        for (let i = 0; i < actorsToProcess.length; i += batchSize) {
          const batch = actorsToProcess.slice(i, i + batchSize);
          
          logger.info('singleLoad: processing batch', { batchIndex: Math.floor(i / batchSize) + 1, batchSize: batch.length });
          
          const batchPromises = batch.map(async (actor) => {
            try {
              const startActorTime = Date.now();
              const credits = await fetchPersonCredits(actor.id);
              
              let filteredCast = credits?.cast || [];
              
              if (filteredCast.length > 0) {
                // Полные 100 фильмов как требуется
                const moviesToProcess = filteredCast.slice(0, 100);
                const FETCH_BATCH_SIZE = 5;
                const filteredCastDetails: Array<{ movie: TMDbPersonCastCredit; isAnime: boolean; isCartoon: boolean }> = [];
                 
                for (let j = 0; j < moviesToProcess.length; j += FETCH_BATCH_SIZE) {
                  const movieBatch = moviesToProcess.slice(j, j + FETCH_BATCH_SIZE);
                  
                  const batchResults = await Promise.all(
                    movieBatch.map(async (movie) => {
                      const mediaType = movie.release_date ? 'movie' : 'tv';
                      const mediaDetails = await fetchMediaDetails(movie.id, mediaType);
                      return {
                        movie,
                        isAnime: mediaDetails ? isAnime(mediaDetails) : false,
                        isCartoon: mediaDetails ? isCartoon(mediaDetails) : false,
                      };
                    })
                  );
                  
                  filteredCastDetails.push(...batchResults);
                  
                  if (j + FETCH_BATCH_SIZE < moviesToProcess.length) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                  }
                }
                
                filteredCast = filteredCastDetails
                  .filter(({ isAnime, isCartoon }) => !isAnime && !isCartoon)
                  .map(({ movie }) => movie);
              }
              
              const totalMovies = filteredCast.length;
              const watchedMovies = actor.watched_movies;
              
              const progressPercent = totalMovies > 0 
                ? Math.round((watchedMovies / totalMovies) * 100)
                : 0;

              const originalEntry = actorMap.get(actor.id)!;
              logger.debug('Actor processed for singleLoad', {
                actorId: actor.id,
                name: actor.name,
                totalMovies,
                duration: Date.now() - startActorTime,
              });
              
              return {
                ...originalEntry,
                total_movies: totalMovies,
                progress_percent: progressPercent,
              };
            } catch (error) {
              logger.error('Error fetching person credits in singleLoad', {
                error: error instanceof Error ? error.message : String(error),
                actorId: actor.id,
              });
              const originalEntry = actorMap.get(actor.id)!;
              return {
                ...originalEntry,
                total_movies: actor.watched_movies,
                progress_percent: actor.watched_movies > 0 ? 100 : 0,
              };
            }
          });
          
          achievementsPromises.push(Promise.all(batchPromises));
          
          // Delay between batches
          if (i + batchSize < actorsToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const allActorsWithFullData = (await Promise.all(achievementsPromises)).flat();
        
        const actorsWithScores = allActorsWithFullData.map(actor => {
          const watched = actor.watched_ids.size;
          const rewatched = actor.rewatched_ids.size;
          const dropped = actor.dropped_ids.size;
          const ratings = Array.from(actor.ratings_map.values());
          const average_rating = ratings.length > 0
            ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
            : null;

          return {
            id: actor.id,
            name: actor.name,
            profile_path: actor.profile_path,
            watched_movies: watched,
            rewatched_movies: rewatched,
            dropped_movies: dropped,
            total_movies: actor.total_movies,
            progress_percent: actor.progress_percent,
            average_rating,
            actor_score: calculateActorScore({
              average_rating,
              watched_movies: watched,
              rewatched_movies: rewatched,
              dropped_movies: dropped,
              total_movies: actor.total_movies,
              progress_percent: actor.progress_percent,
            }),
          };
        });
        
        actorsWithScores.sort((a, b) => b.actor_score - a.actor_score);

        const result = actorsWithScores.slice(0, limit);

        // Save to database
        try {
          await prisma.personProfile.upsert({
            where: {
              userId_personType: { userId: targetUserId, personType: 'actor' },
            },
            update: {
              topPersons: actorsWithScores as any,
              computedAt: new Date(),
              computationMethod: 'full',
            },
            create: {
              userId: targetUserId,
              personType: 'actor',
              topPersons: actorsWithScores as any,
              computationMethod: 'full',
            },
          });
        } catch (error) {
          logger.error('Error saving PersonProfile', {
            error: error instanceof Error ? error.message : String(error),
            userId: targetUserId,
          });
          // Don't throw - return results even if save fails
        }

        return {
          actors: result,
          hasMore: false,
          total: allActorsWithFullData.length,
          singleLoad: true,
        };
      }

      // For paginated mode
      const actorsForProcessing = baseActorsData.slice(0, Math.min(offset + limit + 50, baseActorsData.length));
      
      const achievementsPromises = actorsForProcessing.map(async (actor) => {
        try {
          const credits = await fetchPersonCredits(actor.id);
          
          let filteredCast = credits?.cast || [];
          if (filteredCast.length > 0) {
            // Полные 100 фильмов как требуется
            const moviesToProcess = filteredCast.slice(0, 100);
            const FETCH_BATCH_SIZE = 5;
            const filteredCastDetails: Array<{ movie: TMDbPersonCastCredit; isAnime: boolean; isCartoon: boolean }> = [];
                 
            for (let j = 0; j < moviesToProcess.length; j += FETCH_BATCH_SIZE) {
              const movieBatch = moviesToProcess.slice(j, j + FETCH_BATCH_SIZE);
              
              const batchResults = await Promise.all(
                movieBatch.map(async (movie) => {
                  const mediaType = movie.release_date ? 'movie' : 'tv';
                  const mediaDetails = await fetchMediaDetails(movie.id, mediaType);
                  return {
                    movie,
                    isAnime: mediaDetails ? isAnime(mediaDetails) : false,
                    isCartoon: mediaDetails ? isCartoon(mediaDetails) : false,
                  };
                })
              );
          
              filteredCastDetails.push(...batchResults);
              
              if (j + FETCH_BATCH_SIZE < moviesToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }
            
            filteredCast = filteredCastDetails
              .filter(({ isAnime, isCartoon }) => !isAnime && !isCartoon)
              .map(({ movie }) => movie);
          }
          
          const totalMovies = filteredCast.length;
          const watchedMovies = actor.watched_movies;
          
          const progressPercent = totalMovies > 0 
            ? Math.round((watchedMovies / totalMovies) * 100)
            : 0;

          const originalEntry = actorMap.get(actor.id)!;
          return {
            ...originalEntry,
            total_movies: totalMovies,
            progress_percent: progressPercent,
          };
        } catch (error) {
          logger.error('Error fetching person credits', {
            error: error instanceof Error ? error.message : String(error),
            actorId: actor.id,
          });
          const originalEntry = actorMap.get(actor.id)!;
          return {
            ...originalEntry,
            total_movies: actor.watched_movies,
            progress_percent: actor.watched_movies > 0 ? 100 : 0,
          };
        }
      });

      const actorsWithFullData = await Promise.all(achievementsPromises);
      
      const actorsWithScores = actorsWithFullData.map(actor => {
        const watched = actor.watched_ids.size;
        const rewatched = actor.rewatched_ids.size;
        const dropped = actor.dropped_ids.size;
        const ratings = Array.from(actor.ratings_map.values());
        const average_rating = ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
          : null;

        return {
          id: actor.id,
          name: actor.name,
          profile_path: actor.profile_path,
          watched_movies: watched,
          rewatched_movies: rewatched,
          dropped_movies: dropped,
          total_movies: actor.total_movies,
          progress_percent: actor.progress_percent,
          average_rating,
          actor_score: calculateActorScore({
            average_rating,
            watched_movies: watched,
            rewatched_movies: rewatched,
            dropped_movies: dropped,
            total_movies: actor.total_movies,
            progress_percent: actor.progress_percent,
          }),
        };
      });
      
      actorsWithScores.sort((a, b) => {
        if (a.average_rating !== null && b.average_rating !== null) {
          if (b.average_rating !== a.average_rating) {
            return b.average_rating - a.average_rating;
          }
        } else if (a.average_rating === null && b.average_rating !== null) {
          return 1;
        } else if (a.average_rating !== null && b.average_rating === null) {
          return -1;
        }
        
        if (b.progress_percent !== a.progress_percent) {
          return b.progress_percent - a.progress_percent;
        }
        
        return a.name.localeCompare(b.name, 'ru');
      });

      // Save to database
      try {
        await prisma.personProfile.upsert({
          where: {
            userId_personType: { userId: targetUserId, personType: 'actor' },
          },
          update: {
            topPersons: actorsWithScores as any,
            computedAt: new Date(),
            computationMethod: 'full',
          },
          create: {
            userId: targetUserId,
            personType: 'actor',
            topPersons: actorsWithScores as any,
            computationMethod: 'full',
          },
        });
      } catch (error) {
        logger.error('Error saving PersonProfile', {
          error: error instanceof Error ? error.message : String(error),
          userId: targetUserId,
        });
        // Don't throw - return results even if save fails
      }

      const result = actorsWithScores.slice(offset, Math.min(offset + limit, actorsWithScores.length));

      logger.info('fetchActors completed', {
        userId: targetUserId,
        totalActors: actorsWithScores.length,
        resultCount: result.length,
        duration: Date.now() - fetchStartTime,
      });

      return {
        actors: result,
        hasMore: offset + limit < baseActorsData.length,
        total: baseActorsData.length,
      };
    };

    const result = await withCache(cacheKey, fetchActors, 3600);
    
    logger.info('AchievActorsAPI success', {
      userId: targetUserId,
      actorCount: result.actors?.length || 0,
      totalTime: Date.now() - startTime,
    });

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Ошибка при получении актеров', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'AchievActorsAPI',
      totalTime: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}