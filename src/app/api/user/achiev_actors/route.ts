import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Простое кэширование в памяти для фильмографии актеров
const actorCreditsCache = new Map<number, { data: any; timestamp: number }>();
const CACHE_DURATION = 86400000; // 24 часа в миллисекундах

// Вспомогательная функция для получения деталей с TMDB
async function fetchMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }); // 24 часа
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

// Helper function to check if movie is anime
function isAnime(movie: any): boolean {
  const hasAnimeGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  const isJapanese = movie.original_language === 'ja';
  return hasAnimeGenre && isJapanese;
}

// Helper function to check if movie is cartoon (animation but not anime)
function isCartoon(movie: any): boolean {
  const hasAnimationGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  const isNotJapanese = movie.original_language !== 'ja';
  return hasAnimationGenre && isNotJapanese;
}

interface TMDBMovieCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    profile_path: string | null;
    character: string;
  }>;
}

interface TMDBPersonCredits {
  id: number;
  cast: Array<{
    id: number;
    title: string;
    release_date: string;
    vote_count: number;
  }>;
  crew: Array<{
    id: number;
    title: string;
    release_date: string;
  }>;
}

interface ActorProgress {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

// Получение актёрского состава фильма или сериала
async function fetchMovieCredits(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<TMDBMovieCredits | null> {
  try {
    const url = new URL(`${BASE_URL}/${mediaType}/${tmdbId}/credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: [`${mediaType}-credits`] },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

// Получение полной фильмографии актёра с кэшированием
async function fetchPersonCredits(actorId: number): Promise<TMDBPersonCredits | null> {
  // Проверяем кэш
  const cached = actorCreditsCache.get(actorId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const url = new URL(`${BASE_URL}/person/${actorId}/combined_credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400, tags: ['person-credits'] },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Сохраняем в кэш
    actorCreditsCache.set(actorId, { data, timestamp: now });
    
    return data;
  } catch (error) {
    return null;
  }
}

export async function GET(request: Request) {
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
    
    // Параметры пагинации
    const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 50); // Максимум 50
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    const loadFullData = searchParams.get('fullData') === 'true'; // Загружать ли полную фильмографию

    // Получаем все фильмы и сериалы пользователя со статусом "Просмотрено"
    const watchedMoviesData = await prisma.watchList.findMany({
      where: {
        userId: targetUserId,
        statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] },
        mediaType: { in: ['movie', 'tv'] }, // Включаем и фильмы, и сериалы
      },
      select: {
        tmdbId: true,
        mediaType: true,
        userRating: true,
      },
    });

    if (watchedMoviesData.length === 0) {
      return NextResponse.json([]);
    }

    // Map для хранения актеров и их фильмов с оценками
    const actorMap = new Map<number, {
      name: string;
      profile_path: string | null;
      watchedIds: Set<number>;
      ratings: number[];
    }>();

    // Оптимизированная параллельная загрузка данных об актерах
    const BATCH_SIZE = 10;
    for (let i = 0; i < watchedMoviesData.length; i += BATCH_SIZE) {
      const batch = watchedMoviesData.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (movie) => {
          // Получаем детали для фильтрации мультфильмов и аниме
          const mediaDetails = await fetchMediaDetails(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
          
          // Пропускаем мультфильмы и аниме
          if (mediaDetails && (isAnime(mediaDetails) || isCartoon(mediaDetails))) {
            return { credits: null, rating: movie.userRating };
          }
          
          const credits = await fetchMovieCredits(movie.tmdbId, movie.mediaType as 'movie' | 'tv');
          return { credits, rating: movie.userRating };
        })
      );

      for (const { credits, rating } of results) {
        if (credits?.cast) {
          // Берем только топ-5 актеров из фильма/сериала
          const topActors = credits.cast.slice(0, 5);
          
          for (const actor of topActors) {
            if (!actorMap.has(actor.id)) {
              actorMap.set(actor.id, {
                name: actor.name,
                profile_path: actor.profile_path,
                watchedIds: new Set(),
                ratings: [],
              });
            }
            
            actorMap.get(actor.id)!.watchedIds.add(credits.id);
            if (rating !== null && rating !== undefined) {
              actorMap.get(actor.id)!.ratings.push(rating);
            }
          }
        }
      }

      // Уменьшенная пауза между батчами
      if (i + BATCH_SIZE < watchedMoviesData.length) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    // Берем всех актеров для сортировки, но ограничиваем пагинацией
    const allActors = Array.from(actorMap.entries())
      .sort((a, b) => b[1].watchedIds.size - a[1].watchedIds.size);
    
    // Применяем пагинацию
    const paginatedActors = allActors.slice(offset, offset + limit);
    
    // Подготавливаем базовые данные без фильмографии
    const baseActorsData = paginatedActors.map(([actorId, actorData]) => ({
      id: actorId,
      name: actorData.name,
      profile_path: actorData.profile_path,
      watched_movies: actorData.watchedIds.size,
      total_movies: 0, // Будет загружено позже
      progress_percent: 0, // Будет пересчитано позже
      average_rating: actorData.ratings.length > 0
        ? Number((actorData.ratings.reduce((a, b) => a + b, 0) / actorData.ratings.length).toFixed(1))
        : null,
    }));

    // Если нужна полная фильмография - загружаем ее
    if (loadFullData) {
      const achievementsPromises = baseActorsData.map(async (actor) => {
        const credits = await fetchPersonCredits(actor.id);
        
        const totalMovies = credits?.cast?.length || 0;
        const watchedMovies = actor.watched_movies;
        
        const progressPercent = totalMovies > 0 
          ? Math.round((watchedMovies / totalMovies) * 100)
          : 0;

        return {
          ...actor,
          total_movies: totalMovies,
          progress_percent: progressPercent,
        };
      });

      const achievements = await Promise.all(achievementsPromises);

      // Сортировка результатов
      const result = achievements
        .sort((a, b) => {
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

      return NextResponse.json({
        actors: result,
        hasMore: offset + limit < allActors.length,
        total: allActors.length,
      });
    }

    // Возвращаем базовые данные без фильмографии, но с сортировкой
    const sortedBaseActors = baseActorsData
      .sort((a, b) => {
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

    return NextResponse.json({
      actors: sortedBaseActors,
      hasMore: offset + limit < allActors.length,
      total: allActors.length,
    });

  } catch (error) {
    console.error('Ошибка при получении актеров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
