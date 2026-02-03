// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';
import { rateLimit } from '@/middleware/rateLimit';

// Вспомогательная функция для получения деталей с TMDB
async function fetchMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return null;
  }
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } }); // 24 часа
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Получаем общую статистику
    const [watchedCount, wantToWatchCount, droppedCount, hiddenCount] = await Promise.all([
      // Просмотрено + Пересмотрено
      prisma.watchList.count({
        where: {
          userId,
          statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] },
        },
      }),
      // Хочу посмотреть
      prisma.watchList.count({
        where: { userId, statusId: MOVIE_STATUS_IDS.WANT_TO_WATCH },
      }),
      // Брошено
      prisma.watchList.count({
        where: { userId, statusId: MOVIE_STATUS_IDS.DROPPED },
      }),
      // Скрыто (blacklist)
      prisma.blacklist.count({ where: { userId } }),
    ]);

    // Получаем соотношение по типам контента (по всем статусам кроме скрытых)
    // Получаем все записи кроме скрытых (blacklist)
    const allRecords = await prisma.watchList.findMany({
      where: {
        userId,
        // Все статусы: WANT_TO_WATCH, WATCHED, REWATCHED, DROPPED
        statusId: { 
          in: [
            MOVIE_STATUS_IDS.WANT_TO_WATCH, 
            MOVIE_STATUS_IDS.WATCHED, 
            MOVIE_STATUS_IDS.REWATCHED, 
            MOVIE_STATUS_IDS.DROPPED
          ] 
        },
      },
      select: {
        tmdbId: true,
        mediaType: true,
      },
    });

    // Отладочная информация
    const typeCounts = {
      movie: 0,
      tv: 0,
      cartoon: 0,
      anime: 0,
    };

    // Для каждой записи получаем данные TMDB и определяем тип контента
    for (const record of allRecords) {
      const tmdbData = await fetchMediaDetails(record.tmdbId, record.mediaType as 'movie' | 'tv');
      
      if (tmdbData) {
        if (isAnime(tmdbData)) {
          typeCounts.anime++;
        } else if (isCartoon(tmdbData)) {
          typeCounts.cartoon++;
        } else if (record.mediaType === 'movie') {
          typeCounts.movie++;
        } else if (record.mediaType === 'tv') {
          typeCounts.tv++;
        }
      } else {
        // Если не удалось получить данные TMDB, используем базовый mediaType
        if (record.mediaType in typeCounts) {
          typeCounts[record.mediaType as keyof typeof typeCounts]++;
        }
      }
    }

    // Средняя оценка пользователя
    const avgRatingResult = await prisma.watchList.aggregate({
      where: {
        userId,
        userRating: { not: null },
      },
      _avg: { userRating: true },
      _count: { userRating: true },
    });

    const averageRating = avgRatingResult._avg.userRating
      ? Math.round(avgRatingResult._avg.userRating * 10) / 10
      : null;

    // Общее количество оценённых фильмов
    const ratedCount = avgRatingResult._count.userRating || 0;

    // Общая сумма для расчета процентов (все статусы кроме скрытых)
    const totalForPercentage = watchedCount + wantToWatchCount + droppedCount;

    // Добавляем debug информацию в ответ
    const debugInfo = {
      userId,
      statusIds: {
        DROPPED: MOVIE_STATUS_IDS.DROPPED,
        WANT_TO_WATCH: MOVIE_STATUS_IDS.WANT_TO_WATCH,
        WATCHED: MOVIE_STATUS_IDS.WATCHED,
        REWATCHED: MOVIE_STATUS_IDS.REWATCHED,
      },
      rawCounts: {
        watchedCount,
        wantToWatchCount,
        droppedCount,
        hiddenCount,
        totalForPercentage,
      },
      timestamp: new Date().toISOString(),
    };

    const responseData = {
      total: {
        watched: watchedCount,
        wantToWatch: wantToWatchCount,
        dropped: droppedCount,
        hidden: hiddenCount,
        totalForPercentage,
      },
      typeBreakdown: typeCounts,
      averageRating,
      ratedCount,
      debug: debugInfo,
    };

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
