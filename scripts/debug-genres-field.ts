// scripts/debug-genres-field.ts
// Прямая диагностика: проверить реальное состояние поля genres

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('🔬 Прямая диагностика WatchList.genres\n');

    // Получить первую запись со всеми полями
    const firstRecord = await prisma.watchList.findFirst({
      select: {
        id: true,
        tmdbId: true,
        title: true,
        genres: true,
      },
    });

    if (!firstRecord) {
      console.log('❌ Нет записей в WatchList!');
      process.exit(1);
    }

    console.log('📌 Первая запись в БД:');
    console.log(`   ID: ${firstRecord.id}`);
    console.log(`   TMDB ID: ${firstRecord.tmdbId}`);
    console.log(`   Title: ${firstRecord.title}`);
    console.log(`   genres field type: ${typeof firstRecord.genres}`);
    console.log(`   genres value: ${JSON.stringify(firstRecord.genres)}`);
    console.log(`   genres === null: ${firstRecord.genres === null}`);
    console.log(`   genres === undefined: ${firstRecord.genres === undefined}`);

    // Попробуем получить несколько записей и посмотреть на genres
    console.log('\n📋 Выборка из 5 записей:');
    const samples = await prisma.watchList.findMany({
      take: 5,
      select: {
        id: true,
        tmdbId: true,
        title: true,
        genres: true,
      },
    });

    samples.forEach((rec, idx) => {
      console.log(`\n  ${idx + 1}. "${rec.title}"`);
      console.log(`     genres: ${JSON.stringify(rec.genres)}`);
    });

    // Прямой SQL запрос чтобы проверить структуру
    console.log('\n💾 Прямой SQL запрос:');
    const dirtyRecords = await prisma.$queryRaw`
      SELECT id, "tmdbId", title, genres 
      FROM "WatchList" 
      LIMIT 3
    ` as any[];

    dirtyRecords.forEach((rec, idx) => {
      console.log(`\n  ${idx + 1}. "${rec.title}"`);
      console.log(`     SQL genres type: ${typeof rec.genres}`);
      console.log(`     SQL genres value: ${JSON.stringify(rec.genres)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

main();
