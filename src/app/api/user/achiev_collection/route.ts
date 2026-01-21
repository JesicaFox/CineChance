import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

interface TMDBMovieDetails {
  id: number;
  title: string;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
  } | null;
  release_date: string;
}

interface CollectionProgress {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  watched_movies: number;
  added_movies: number;
  progress_percent: number;
}

// Получение деталей фильма с информацией о коллекции
async function fetchMovieWithCollection(tmdbId: number): Promise<TMDBMovieDetails | null> {
  try {
    const url = new URL(`${BASE_URL}/movie/${tmdbId}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400 }, // Кэшируем на 24 часа
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching movie ${tmdbId}:`, error);
    return null;
  }
}

// Получение списка фильмов в коллекции
async function fetchCollectionMovies(collectionId: number): Promise<number[]> {
  try {
    const url = new URL(`${BASE_URL}/collection/${collectionId}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.parts || []).map((movie: { id: number }) => movie.id);
  } catch (error) {
    console.error(`Error fetching collection ${collectionId}:`, error);
    return [];
  }
}

/**
 * API-эндпоинт для получения достижений пользователя по коллекциям.
 * 
 * Логика:
 * 1. Получаем все просмотренные фильмы пользователя из базы
 * 2. Для каждого фильма запрашиваем TMDB API для получения информации о коллекции
 * 3. Группируем фильмы по коллекциям и считаем прогресс
 * 
 * Возвращает массив объектов с прогрессом по каждой коллекции.
 */
export async function GET(request: Request) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Требуется аутентификация' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Получаем userId из параметров запроса
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || userId;

    // Получаем все фильмы пользователя со статусом "Просмотрено"
    const watchedMovies = await prisma.watchList.findMany({
      where: {
        userId: targetUserId,
        status: { name: { in: ['Просмотрено', 'Пересмотрено'] } },
      },
      select: {
        tmdbId: true,
        mediaType: true,
      },
    });

    if (watchedMovies.length === 0) {
      return NextResponse.json([]);
    }

    // Map для хранения коллекций и их фильмов
    const collectionMap = new Map<number, { 
      name: string; 
      poster_path: string | null; 
      watchedIds: Set<number>;
    }>();

    // Параллельная загрузка данных о коллекциях (с ограничением concurrency)
    const BATCH_SIZE = 5;
    for (let i = 0; i < watchedMovies.length; i += BATCH_SIZE) {
      const batch = watchedMovies.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (movie) => {
          // Только фильмы могут быть в коллекциях
          if (movie.mediaType !== 'movie') return null;
          
          const details = await fetchMovieWithCollection(movie.tmdbId);
          return details;
        })
      );

      for (const details of results) {
        if (details?.belongs_to_collection) {
          const collection = details.belongs_to_collection;
          
          if (!collectionMap.has(collection.id)) {
            collectionMap.set(collection.id, {
              name: collection.name,
              poster_path: collection.poster_path,
              watchedIds: new Set(),
            });
          }
          
          collectionMap.get(collection.id)!.watchedIds.add(details.id);
        }
      }

      // Небольшая пауза между батчами для избежания rate limiting
      if (i + BATCH_SIZE < watchedMovies.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Для каждой коллекции получаем общее количество фильмов и считаем прогресс
    const achievements: CollectionProgress[] = [];
    const collectionEntries = Array.from(collectionMap.entries());

    for (const [collectionId, collectionData] of collectionEntries) {
      const collectionMovies = await fetchCollectionMovies(collectionId);
      const totalMovies = collectionMovies.length;
      const watchedMoviesCount = collectionData.watchedIds.size;
      
      // Считаем, сколько из просмотренных фильмов пользователя есть в этой коллекции
      const watchedInCollection = collectionData.watchedIds.size;

      achievements.push({
        id: collectionId,
        name: collectionData.name,
        poster_path: collectionData.poster_path,
        total_movies: totalMovies,
        added_movies: watchedInCollection,
        watched_movies: watchedInCollection,
        progress_percent: totalMovies > 0 
          ? Math.round((watchedInCollection / totalMovies) * 100)
          : 0,
      });

      // Пауза между запросами для избежания rate limiting
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    // Сортируем по прогрессу и количеству просмотренных
    achievements.sort((a, b) => {
      if (b.progress_percent !== a.progress_percent) {
        return b.progress_percent - a.progress_percent;
      }
      return b.watched_movies - a.watched_movies;
    });

    return NextResponse.json(achievements);

  } catch (error) {
    console.error('Ошибка при получении достижений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
