// scripts/normalize-watchlist-genres.ts
// Миграция: нормализовать жанры в существующих записях WatchList
// Разделяет комбинированные TV жанры на базовые жанры

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';
import { normalizeGenres } from '../src/lib/tmdb-genres';

interface Genre {
  id: number;
  name: string;
}

async function main() {
  try {
    console.log('🚀 Начинаем нормализацию жанров в WatchList...\n');

    // 1. Найти все записи с genres не null
    const recordsWithGenres = await prisma.$queryRaw<Array<{ id: string; genres: any }>>`
      SELECT id, genres FROM "WatchList" WHERE genres IS NOT NULL
    `;

    console.log(`📊 Найдено записей для обработки: ${recordsWithGenres.length}`);

    if (recordsWithGenres.length === 0) {
      console.log('✅ Нет записей для нормализации!');
      process.exit(0);
    }

    // 2. Обработать и нормализовать жанры
    let needsNormalization = 0;
    const normalizeMapping: Map<string, Array<{ id: number; name: string }>> = new Map();

    for (const record of recordsWithGenres) {
      const genres = record.genres as Genre[];
      
      if (!Array.isArray(genres)) {
        continue;
      }

      // Проверяем, есть ли комбинированные жанры
      const hasCompositeGenres = genres.some(g => 
        [10759, 10765, 10768].includes(g.id)
      );

      if (hasCompositeGenres) {
        needsNormalization++;
        const normalized = normalizeGenres(genres);
        normalizeMapping.set(record.id, normalized);
      }
    }

    console.log(`\n📋 Статистика:`);
    console.log(`   Всего записей: ${recordsWithGenres.length}`);
    console.log(`   Нужна нормализация: ${needsNormalization}`);
    console.log(`   Уже нормализовано: ${recordsWithGenres.length - needsNormalization}\n`);

    if (needsNormalization === 0) {
      console.log('✅ Все жанры уже нормализованы!');
      process.exit(0);
    }

    // 3. Обновить записи с нормализованными жанрами
    console.log('💾 Начинаем обновление БД...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const [recordId, normalizedGenres] of normalizeMapping.entries()) {
      try {
        await prisma.watchList.update({
          where: { id: recordId },
          data: {
            genres: normalizedGenres as any,
          },
        });

        successCount++;

        if (successCount % 50 === 0) {
          console.log(`  ✓ Обновлено: ${successCount}/${needsNormalization}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Ошибка обновления ${recordId}:`, error);
      }
    }

    // 4. Финальный отчет
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Нормализация завершена!`);
    console.log(`   Успешно нормализовано: ${successCount}`);
    console.log(`   Ошибок: ${errorCount}`);
    
    // Показываем примеры нормализации
    const examples = Array.from(normalizeMapping.entries()).slice(0, 3);
    if (examples.length > 0) {
      console.log(`\n📋 Примеры нормализации:`);
      examples.forEach(([_, normalized], idx) => {
        const genreNames = normalized.map(g => g.name).join(', ');
        console.log(`   ${idx + 1}. ${genreNames}`);
      });
    }
    
    process.exit(errorCount === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Критичная ошибка миграции:', error);
    process.exit(1);
  }
}

main();
