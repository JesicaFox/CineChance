// scripts/migrate-anime-cartoon-mediaType.ts
// Миграция: обновить mediaType на 'anime' или 'cartoon' для старых записей watchList

// CRITICAL: Load environment FIRST before any Prisma imports
import './init-env';

// ONLY import Prisma AFTER environment is loaded
import { prisma } from '../src/lib/prisma';

async function detectMediaType(details: any): Promise<string> {
  const genres = details.genre_ids || (details.genres?.map((g: any) => g.id) ?? []);
  const language = details.original_language || '';
  const mediaType = details.media_type || 'movie';

  // Simple detection logic
  const animeGenreIds = [16]; // Animation genre
  const isAnimated = genres.includes(animeGenreIds[0]);
  
  // Detect anime by language and genre
  if (isAnimated && (language === 'ja' || language === 'zh')) {
    return 'anime';
  }
  
  // Detect cartoon by animation + english
  if (isAnimated && (language === 'en' || language === '')) {
    return 'cartoon';
  }

  return mediaType;
}

async function main() {
  try {
    console.log('🚀 Начинаем миграцию mediaType...');

    const all = await prisma.watchList.findMany({
      where: {
        OR: [
          { mediaType: 'movie' },
          { mediaType: 'tv' },
        ],
      },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
      },
    });

    console.log(`✅ Найдено записей для обработки: ${all.length}`);

    let updated = 0;
    for (let i = 0; i < all.length; i++) {
      const rec = all[i];
      
      // Fetch TMDB details
      const tmdbApiKey = process.env.TMDB_API_KEY;
      if (!tmdbApiKey) {
        console.warn('⚠️  TMDB_API_KEY не установлен. Пропускаем преобразование...');
        break;
      }

      const mediaTypeParam = rec.mediaType === 'tv' ? 'tv' : 'movie';
      const response = await fetch(`https://api.themoviedb.org/3/${mediaTypeParam}/${rec.tmdbId}?api_key=${tmdbApiKey}`);
      
      if (!response.ok) {
        console.warn(`⚠️  Не удалось получить данные для TMDB ID ${rec.tmdbId}`);
        continue;
      }

      const details = await response.json();
      const newType = await detectMediaType({
        ...details,
        media_type: rec.mediaType,
      });

      if (newType !== rec.mediaType) {
        await prisma.watchList.update({
          where: { id: rec.id },
          data: { mediaType: newType },
        });
        updated++;
        console.log(`  [${i + 1}/${all.length}] ✓ Обновлено: TMDB ${rec.tmdbId} (${rec.mediaType} → ${newType})`);
      }
      
      // Rate limiting
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Миграция завершена. Обновлено записей: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    
    // Check if it's a Neon connection error
    const errorMsg = String(error);
    if (errorMsg.includes('No database host') || errorMsg.includes('localhost')) {
      console.error('\n💡 Подсказка: Похоже, DATABASE_URL некорректна\n');
      console.error('Проверьте содержимое .env.local файла');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
