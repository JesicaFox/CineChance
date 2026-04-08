// scripts/migrate-watchlist-genres.ts
// Миграция: заполнить поле genres для всех записей WatchList
// Оптимизирована с дедупликацией, батчингом и массовым обновлением

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma } from '../src/lib/prisma';

interface Genre {
  id: number;
  name: string;
}

interface MediaKey {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
}

interface FetchResult {
  key: MediaKey;
  genres: Genre[] | null; // null если ошибка, [] если 404
}

async function fetchMediaGenres(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<Genre[] | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  TMDB_API_KEY не установлен');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=en-US`;
    const response = await fetch(url, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // Empty array for not found
      }
      console.warn(`  ⚠️  Ошибка API для TMDB ID ${tmdbId}: статус ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    
    // TMDB возвращает genres как массив объектов {id, name}
    if (data.genres && Array.isArray(data.genres)) {
      return data.genres.map((g: any) => ({
        id: g.id,
        name: g.name,
      }));
    }

    return [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`  ⚠️  Timeout для TMDB ID ${tmdbId}`);
    } else {
      console.warn(`  ⚠️  Ошибка при загрузке жанров для TMDB ID ${tmdbId}:`, error);
    }
    return null;
  }
}

// Батчинг с контролем: 5 параллельно, 200мс задержка между запросами
async function fetchBatch(keys: MediaKey[], batchNum: number, totalBatches: number): Promise<FetchResult[]> {
  const batchSize = 5;
  const results: FetchResult[] = [];

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const subbatchNum = Math.floor(i / batchSize) + 1;
    const totalSubbatches = Math.ceil(keys.length / batchSize);
    
    console.log(`  📡 Батч ${batchNum}/${totalBatches} | Запрос ${subbatchNum}/${totalSubbatches} (${batch.length} фильмов)`);

    // Параллельная загрузка 5 фильмов
    const promises = batch.map((key) =>
      fetchMediaGenres(key.tmdbId, key.mediaType).then((genres) => ({
        key,
        genres,
      }))
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // 200мс задержка между запросами для соблюдения rate limiting
    if (i + batchSize < keys.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}

async function main() {
  try {
    console.log('🚀 Начинаем миграцию genres в WatchList...\n');

    // 1. Найти все записи без genres используя прямой SQL
    const records = await prisma.$queryRaw<Array<{ id: string; tmdbId: number; mediaType: string }>>`
      SELECT id, "tmdbId", "mediaType" FROM "WatchList" WHERE genres IS NULL
    `;

    console.log(`📊 Найдено записей для обработки: ${records.length}\n`);

    if (records.length === 0) {
      console.log('✅ Нет записей для миграции!');
      process.exit(0);
    }

    // 2. Дедупликация: найти уникальные (tmdbId, mediaType)
    const uniqueKeysSet = new Map<string, MediaKey>();
    const recordsByKey = new Map<string, string[]>(); // key -> recordIds

    for (const record of records) {
      const keyStr = `${record.tmdbId}:${record.mediaType}`;
      uniqueKeysSet.set(keyStr, {
        tmdbId: record.tmdbId,
        mediaType: record.mediaType as 'movie' | 'tv',
      });
      
      if (!recordsByKey.has(keyStr)) {
        recordsByKey.set(keyStr, []);
      }
      recordsByKey.get(keyStr)!.push(record.id);
    }

    const uniqueKeys = Array.from(uniqueKeysSet.values());
    console.log(`🔍 Уникальных пар (tmdbId, mediaType): ${uniqueKeys.length}`);
    console.log(`   Сэкономили на дедупликации: ${records.length - uniqueKeys.length} запросов\n`);

    // 3. Батчинг: фетчим жанры для уникальных пар
    const batchSize = 50; // 50 пар на батч
    const totalBatches = Math.ceil(uniqueKeys.length / batchSize);
    const fetchResults: FetchResult[] = [];

    for (let i = 0; i < uniqueKeys.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batch = uniqueKeys.slice(i, i + batchSize);

      console.log(`\n📦 Батч ${batchNum}/${totalBatches} (${batch.length} пар):`);
      const results = await fetchBatch(batch, batchNum, totalBatches);
      fetchResults.push(...results);

      // Небольшая пауза между батчами основного уровня
      if (i + batchSize < uniqueKeys.length) {
        console.log(`  ⏳ Пауза перед следующим батчем основного уровня...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n✅ Загрузка данных завершена`);
    console.log(`   Успешно загружено: ${fetchResults.filter(r => r.genres !== null).length}`);
    console.log(`   Ошибок: ${fetchResults.filter(r => r.genres === null).length}\n`);

    // 4. Массовое обновление через updateMany по (tmdbId, mediaType)
    console.log('💾 Начинаем обновление БД...\n');

    let updatedCount = 0;
    let skippedCount = 0;

    for (const result of fetchResults) {
      if (result.genres === null) {
        // Пропускаем ошибки
        skippedCount++;
        console.log(`  ⊘ Пропущено TMDB ${result.key.tmdbId} (${result.key.mediaType}): ошибка загрузки`);
        continue;
      }

      try {
        // Use raw SQL for updateMany with JSON field
        const updateResult = await prisma.$executeRaw`
          UPDATE "WatchList"
          SET genres = ${JSON.stringify(result.genres!)}
          WHERE "tmdbId" = ${result.key.tmdbId}
            AND "mediaType" = ${result.key.mediaType}
            AND genres IS NULL
        `;
        
        // Convert raw result to expected format
        const count = typeof updateResult === 'number' ? updateResult : 0;

        updatedCount += count;
        const genreCount = result.genres!.length;
        console.log(`  ✓ TMDB ${result.key.tmdbId} (${result.key.mediaType}): обновлено ${count} записей (${genreCount} жанров)`);
      } catch (error) {
        skippedCount++;
        console.error(`  ✗ Ошибка обновления TMDB ${result.key.tmdbId}:`, error);
      }
    }

    // 5. Финальный отчет
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Миграция завершена!`);
    console.log(`   Всего записей для обновления: ${records.length}`);
    console.log(`   Обновлено: ${updatedCount}`);
    console.log(`   Пропущено: ${records.length - updatedCount}`);
    console.log(`   Успешно обработано уникальных пар: ${fetchResults.filter(r => r.genres !== null).length}/${uniqueKeys.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Критичная ошибка миграции:', error);
    process.exit(1);
  }
}

main();
