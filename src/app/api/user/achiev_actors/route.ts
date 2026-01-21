import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

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

// Получение актёрского состава фильма
async function fetchMovieCredits(tmdbId: number): Promise<TMDBMovieCredits | null> {
  try {
    const url = new URL(`${BASE_URL}/movie/${tmdbId}/credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching credits for movie ${tmdbId}:`, error);
    return null;
  }
}

// Получение полной фильмографии актёра
async function fetchPersonCredits(actorId: number): Promise<TMDBPersonCredits | null> {
  try {
    const url = new URL(`${BASE_URL}/person/${actorId}/combined_credits`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching credits for actor ${actorId}:`, error);
    return null;
  }
}

/**
 * API-эндпоинт для получения достижений пользователя по любимым актерам.
 * 
 * Логика:
 * 1. Получаем все просмотренные фильмы пользователя из базы (включая оценки)
 * 2. Для каждого фильма запрашиваем TMDB API для получения актёрского состава
 * 3. Группируем фильмы по актерам и считаем количество просмотренных
 * 4. Для топ-актеров запрашиваем полную фильмографию из TMDB
 * 5. Вычисляем процент заполнения фильмографии
 * 6. Сортируем по: watched_movies → progress_percent → average_rating
 */
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

    // Получаем все фильмы пользователя со статусом "Просмотрено" (включая оценки)
    const watchedMoviesData = await prisma.watchList.findMany({
      where: {
        userId: targetUserId,
        status: { name: { in: ['Просмотрено', 'Пересмотрено'] } },
        mediaType: 'movie',
      },
      select: {
        tmdbId: true,
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

    // Параллельная загрузка данных об актерах (с ограничением concurrency)
    const BATCH_SIZE = 5;
    for (let i = 0; i < watchedMoviesData.length; i += BATCH_SIZE) {
      const batch = watchedMoviesData.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (movie) => {
          const credits = await fetchMovieCredits(movie.tmdbId);
          return { credits, rating: movie.userRating };
        })
      );

      for (const { credits, rating } of results) {
        if (credits?.cast) {
          for (const actor of credits.cast) {
            if (!actorMap.has(actor.id)) {
              actorMap.set(actor.id, {
                name: actor.name,
                profile_path: actor.profile_path,
                watchedIds: new Set(),
                ratings: [],
              });
            }
            
            actorMap.get(actor.id)!.watchedIds.add(credits.id);
            // Сохраняем оценку если она есть
            if (rating !== null && rating !== undefined) {
              actorMap.get(actor.id)!.ratings.push(rating);
            }
          }
        }
      }

      // Небольшая пауза между батчами для избежания rate limiting
      if (i + BATCH_SIZE < watchedMoviesData.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Берем топ-100 актеров для запроса их фильмографии
    const topActors = Array.from(actorMap.entries())
      .sort((a, b) => b[1].watchedIds.size - a[1].watchedIds.size)
      .slice(0, 100);

    // Запрашиваем полную фильмографию для каждого топ-актера
    const achievements: ActorProgress[] = [];
    
    for (const [actorId, actorData] of topActors) {
      const credits = await fetchPersonCredits(actorId);
      
      // Считаем общее количество фильмов в фильмографии (только фильмы, где actor в cast)
      const totalMovies = credits?.cast?.length || 0;
      const watchedMovies = actorData.watchedIds.size;
      
      // Вычисляем процент прогресса
      const progressPercent = totalMovies > 0 
        ? Math.round((watchedMovies / totalMovies) * 100)
        : 0;

      // Вычисляем среднюю оценку
      const averageRating = actorData.ratings.length > 0
        ? Number((actorData.ratings.reduce((a, b) => a + b, 0) / actorData.ratings.length).toFixed(1))
        : null;

      achievements.push({
        id: actorId,
        name: actorData.name,
        profile_path: actorData.profile_path,
        watched_movies: watchedMovies,
        total_movies: totalMovies,
        progress_percent: progressPercent,
        average_rating: averageRating,
      });

      // Пауза между запросами для избежания rate limiting
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    // Сортируем по:
    // 1. Количество просмотренных фильмов (убывание)
    // 2. Процент заполнения (убывание)
    // 3. Средняя оценка (убывание)
    const result = achievements
      .sort((a, b) => {
        // Первичная сортировка по количеству просмотренных фильмов
        if (b.watched_movies !== a.watched_movies) {
          return b.watched_movies - a.watched_movies;
        }
        
        // Вторичная сортировка по проценту заполнения
        if (b.progress_percent !== a.progress_percent) {
          return b.progress_percent - a.progress_percent;
        }
        
        // Третичная сортировка по средней оценке
        if (a.average_rating === null && b.average_rating === null) return 0;
        if (a.average_rating === null) return 1; // null в конец
        if (b.average_rating === null) return -1;
        return b.average_rating - a.average_rating;
      })
      .slice(0, 100);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка при получении актеров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
