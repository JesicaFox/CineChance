// scripts/check-watchlist-genres.ts
// Диагностика: проверить состояние поля genres в WatchList

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('📊 Диагностика WatchList.genres\n');

    // Всего записей
    const total = await prisma.watchList.count();
    console.log(`📈 Всего записей в WatchList: ${total}`);

    // Используем прямой SQL для поиска null в JSON поле
    const nullResult = await prisma.$queryRaw<Array<{ count: string }>>`
      SELECT COUNT(*) as count FROM "WatchList" WHERE genres IS NULL
    `;
    const withNullGenres = parseInt(nullResult[0].count);
    console.log(`📭 Записей с genres = null: ${withNullGenres}`);

    // Записи с genres != null
    const notNullResult = await prisma.$queryRaw<Array<{ count: string }>>`
      SELECT COUNT(*) as count FROM "WatchList" WHERE genres IS NOT NULL
    `;
    const withGenres = parseInt(notNullResult[0].count);
    console.log(`📦 Записей с genres != null: ${withGenres}`);

    if (withGenres > 0) {
      console.log('\n🔍 Примеры записей с genres:');
      const samples = await prisma.$queryRaw<Array<{id: string, tmdbId: number, title: string, genres: any}>>`
        SELECT id, "tmdbId", title, genres FROM "WatchList" WHERE genres IS NOT NULL LIMIT 3
      `;

      samples.forEach((item, idx) => {
        console.log(`\n  ${idx + 1}. "${item.title}" (TMDB ${item.tmdbId})`);
        console.log(`     genres: ${JSON.stringify(item.genres)}`);
      });
    }

    if (withNullGenres > 0) {
      console.log('\n🔍 Примеры записей без genres:');
      const samples = await prisma.$queryRaw<Array<{id: string, tmdbId: number, title: string, mediaType: string}>>`
        SELECT id, "tmdbId", title, "mediaType" FROM "WatchList" WHERE genres IS NULL LIMIT 3
      `;

      samples.forEach((item, idx) => {
        console.log(`\n  ${idx + 1}. "${item.title}" (TMDB ${item.tmdbId}, ${item.mediaType})`);
      });
    }

    console.log('\n' + '='.repeat(50));
    if (withNullGenres === 0) {
      console.log('✅ Все записи уже имеют заполненное поле genres!');
    } else {
      console.log(`⚠️  Нужно заполнить ${withNullGenres} записей`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
    process.exit(1);
  }
}

main();
