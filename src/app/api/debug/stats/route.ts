// Debug endpoint для проверки статистики
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS, getStatusIdByName, getStatusNameById } from '@/lib/movieStatusConstants';

// Вспомогательная функция для получения деталей с TMDB
async function fetchMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.log('TMDB_API_KEY не найден');
    return null;
  }
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU`;
  try {
    console.log(`Запрос TMDB: ${mediaType}/${tmdbId}`);
    const res = await fetch(url, { next: { revalidate: 86400 } }); // 24 часа
    if (!res.ok) {
      console.log(`Ошибка TMDB: ${res.status} ${res.statusText} для ${mediaType}/${tmdbId}`);
      return null;
    }
    const data = await res.json();
    console.log(`Получены данные для ${mediaType}/${tmdbId}:`, {
      title: data.title || data.name,
      genres: data.genres?.map((g: any) => ({ id: g.id, name: g.name })),
      original_language: data.original_language
    });
    return data;
  } catch (error) {
    console.log(`Ошибка запроса к TMDB для ${mediaType}/${tmdbId}:`, error);
    return null;
  }
}

// Helper function to check if movie is anime
function isAnime(movie: any): boolean {
  const hasAnimeGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  const isJapanese = movie.original_language === 'ja';
  console.log(`Проверка аниме: ${movie.title || movie.name} - жанр 16: ${hasAnimeGenre}, язык ja: ${isJapanese}`);
  return hasAnimeGenre && isJapanese;
}

// Helper function to check if movie is cartoon (animation but not anime)
function isCartoon(movie: any): boolean {
  const hasAnimationGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  const isNotJapanese = movie.original_language !== 'ja';
  console.log(`Проверка мультфильма: ${movie.title || movie.name} - жанр 16: ${hasAnimationGenre}, язык не ja: ${isNotJapanese}`);
  return hasAnimationGenre && isNotJapanese;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('=== DEBUG ПОЛНЫЙ АНАЛИЗ ===');
    console.log('User ID:', userId);
    
    // Собираем всю отладочную информацию
    const debugInfo = {
      userId,
      statusConstants: {
        MOVIE_STATUS_IDS,
        MOVIE_STATUS_NAMES: {
          [MOVIE_STATUS_IDS.WANT_TO_WATCH]: 'Хочу посмотреть',
          [MOVIE_STATUS_IDS.WATCHED]: 'Просмотрено',
          [MOVIE_STATUS_IDS.REWATCHED]: 'Пересмотрено',
          [MOVIE_STATUS_IDS.DROPPED]: 'Брошено',
        }
      },
      statusTests: {
        'Брошено': getStatusIdByName('Брошено'),
        'Хочу посмотреть': getStatusIdByName('Хочу посмотреть'),
        'Просмотрено': getStatusIdByName('Просмотрено'),
        'Пересмотрено': getStatusIdByName('Пересмотрено'),
      },
      databaseCounts: {},
      sampleRecords: [] as any[],
      typeAnalysis: {
        totalRecords: 0,
        typeCounts: { movie: 0, tv: 0, cartoon: 0, anime: 0 },
        animationContent: [] as any[]
      }
    };

    // Считаем количество записей по каждому статусу
    const counts = await Promise.all([
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.WANT_TO_WATCH } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.WATCHED } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.REWATCHED } }),
      prisma.watchList.count({ where: { userId, statusId: MOVIE_STATUS_IDS.DROPPED } }),
    ]);

    debugInfo.databaseCounts = {
      wantToWatch: counts[0],
      watched: counts[1],
      rewatched: counts[2],
      dropped: counts[3],
      totalWatched: counts[1] + counts[2], // watched + rewatched
    };

    // Получаем несколько записей со статусом DROPPED для примера
    const droppedRecords = await prisma.watchList.findMany({
      where: { 
        userId, 
        statusId: MOVIE_STATUS_IDS.DROPPED 
      },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        statusId: true,
        addedAt: true,
        userRating: true,
      },
      take: 5, // максимум 5 записей для примера
      orderBy: { addedAt: 'desc' }
    });

    debugInfo.sampleRecords = droppedRecords.map(record => ({
      ...record,
      statusName: getStatusNameById(record.statusId),
      addedAt: record.addedAt.toISOString(),
    }));

    // Анализ типов контента (аниме/мультфильмы)
    console.log('\n=== АНАЛИЗ ТИПОВ КОНТЕНТА ===');
    
    // Получаем все записи для анализа типов контента
    const allRecords = await prisma.watchList.findMany({
      where: {
        userId,
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
        statusId: true,
      },
      take: 20, // Ограничим для анализа
    });

    console.log(`Анализируем ${allRecords.length} записей для типов контента`);

    const detailedAnalysis = [];
    const typeCounts = {
      movie: 0,
      tv: 0,
      cartoon: 0,
      anime: 0,
    };

    // Для каждой записи получаем данные TMDB и определяем тип контента
    for (const record of allRecords) {
      console.log(`\n--- Анализ записи: ${record.mediaType}/${record.tmdbId} ---`);
      
      const tmdbData = await fetchMediaDetails(record.tmdbId, record.mediaType as 'movie' | 'tv');
      
      if (tmdbData) {
        const analysis = {
          tmdbId: record.tmdbId,
          mediaType: record.mediaType,
          statusId: record.statusId,
          title: tmdbData.title || tmdbData.name,
          original_language: tmdbData.original_language,
          genres: tmdbData.genres?.map((g: any) => ({ id: g.id, name: g.name })) || [],
          hasAnimationGenre: tmdbData.genres?.some((g: any) => g.id === 16) ?? false,
          isJapanese: tmdbData.original_language === 'ja',
          finalType: null as string,
        };

        if (isAnime(tmdbData)) {
          typeCounts.anime++;
          analysis.finalType = 'anime';
        } else if (isCartoon(tmdbData)) {
          typeCounts.cartoon++;
          analysis.finalType = 'cartoon';
        } else if (record.mediaType === 'movie') {
          typeCounts.movie++;
          analysis.finalType = 'movie';
        } else if (record.mediaType === 'tv') {
          typeCounts.tv++;
          analysis.finalType = 'tv';
        }

        detailedAnalysis.push(analysis);
      } else {
        // Если не удалось получить данные TMDB, используем базовый mediaType
        const analysis = {
          tmdbId: record.tmdbId,
          mediaType: record.mediaType,
          statusId: record.statusId,
          title: 'Unknown (TMDB error)',
          original_language: 'unknown',
          genres: [],
          hasAnimationGenre: false,
          isJapanese: false,
          finalType: record.mediaType,
          tmdbError: true,
        };

        if (record.mediaType in typeCounts) {
          typeCounts[record.mediaType as keyof typeof typeCounts]++;
        }

        detailedAnalysis.push(analysis);
      }
    }
    
    console.log('\n=== ИТОГОВЫЕ СЧЕТЧИКИ ТИПОВ ===');
    console.log('Type counts:', typeCounts);

    // Фильтруем только контент с жанром Animation
    const animationContent = detailedAnalysis.filter(item => 
      item.hasAnimationGenre || item.finalType === 'anime' || item.finalType === 'cartoon'
    );

    debugInfo.typeAnalysis = {
      totalRecords: allRecords.length,
      typeCounts,
      animationContent,
    };

    return NextResponse.json(debugInfo);

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error.message }, 
      { status: 500 }
    );
  }
}
