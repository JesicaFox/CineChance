// Утилиты для оптимизации Prisma запросов
import { PrismaClient } from '@prisma/client';

/**
 * Разбивает массив на части указанного размера
 * Используется для batch-операций с большими наборами данных
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Выполняет операции над чанками параллельно
 * Полезно для bulk-операций, которые могут выполняться параллельно
 */
export async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (_chunk: T[]) => Promise<R>,
  parallelChunks: number = 1
): Promise<R[]> {
  const chunks = chunkArray(items, chunkSize);
  const results: R[] = [];

  for (let i = 0; i < chunks.length; i += parallelChunks) {
    const batch = chunks.slice(i, i + parallelChunks);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Тип для транзакционной функции Prisma
 * Используется для определения типа callback в транзакциях
 */
export type PrismaTransaction<T = unknown> = (
  _tx: Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
  >
) => Promise<T>;
