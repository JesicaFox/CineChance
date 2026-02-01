// Тест для проверки оптимизации запроса к MovieStatus
import { prisma } from './src/lib/prisma';
import { Prisma } from '@prisma/client';

interface WatchListItem {
  mediaType: string;
  tmdbId: number;
  statusId: number | null;
  userRating: number | null;
}

async function testQueryOptimization() {
  console.log('🔍 Тестирование оптимизации запроса к MovieStatus...');
  
  // Симуляция пользователя с большим watchlist
  const testUserId = 'test-user-id';
  
  try {
    console.time('New optimized query');
    // Новый оптимизированный запрос с обработкой ошибок
    const optimizedQuery = await prisma.watchList.findMany({
      where: { userId: testUserId },
      select: {
        mediaType: true,
        tmdbId: true,
        statusId: true,
        userRating: true,
      }
    }) as WatchListItem[];
    console.timeEnd('New optimized query');
    
    console.log(`✅ Загружено ${optimizedQuery.length} записей из watchlist`);
    
    // Проверяем маппинг статусов с защитой от неизвестных значений
    const STATUS_FROM_ID: Record<number, string> = {
      1: 'want',
      2: 'watched', 
      3: 'dropped',
      4: 'rewatched',
    };
    
    const mappedData = optimizedQuery.map((item: WatchListItem) => ({
      key: `${item.mediaType}_${item.tmdbId}`,
      status: item.statusId !== null && item.statusId !== undefined 
        ? (STATUS_FROM_ID[item.statusId] || null)
        : null,
      userRating: item.userRating
    }));
    
    console.log('✅ Статусы успешно замаплены');
    console.log('📊 Пример данных:', mappedData.slice(0, 3));
    
    // Проверяем граничные случаи
    const edgeCases = optimizedQuery.filter(item => 
      item.statusId === null || 
      item.statusId === undefined || 
      !STATUS_FROM_ID[item.statusId!]
    );
    
    if (edgeCases.length > 0) {
      console.log(`⚠️  Найдено ${edgeCases.length} записей с некорректными статусами`);
    }
    
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`❌ Prisma ошибка (${error.code}):`, error.message);
    } else if (error instanceof Error) {
      console.error('❌ Общая ошибка:', error.message);
    } else {
      console.error('❌ Неизвестная ошибка:', error);
    }
  }
}

// Инструкции для запуска теста:
// 1. Убедитесь что у вас есть тестовый пользователь в БД
// 2. Запустите: npx tsx test-optimization.ts
// 3. Сравните время выполнения и SQL запросы в консоли

export { testQueryOptimization };
