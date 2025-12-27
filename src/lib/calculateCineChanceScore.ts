// lib/calculateCineChanceScore.ts

// Константы для настройки формулы
const TRANSITION_VOTES = 50 // Переходная точка для смены формулы
const MIN_CINE_WEIGHT = 0.15 // Минимум влияния Cine-chance (15%)
const MAX_CINE_WEIGHT = 0.80 // Максимум влияния Cine-chance (80%)
const IMDB_M = 2 // Параметр m для формулы IMDB (при малом количестве голосов)

/**
 * Вычисляет взвешенный рейтинг на основе TMDB и Cine-chance
 * 
 * Использует комбинированный подход:
 * - При малом количестве голосов (< 50): формула IMDB с m=2
 * - При большом количестве голосов: сравнение голосов
 * - Всегда применяется минимум 15% и максимум 80% влияния Cine-chance
 */
export function calculateCineChanceScore({
  tmdbRating,
  tmdbVotes,
  cineChanceRating,
  cineChanceVotes,
}: {
  tmdbRating: number
  tmdbVotes: number
  cineChanceRating?: number | null
  cineChanceVotes: number
}): number {
  // Если нет оценок Cine-chance или нет данных о голосах TMDB,
  // возвращаем TMDB рейтинг
  if (!cineChanceRating || cineChanceVotes === 0 || tmdbVotes === 0) {
    return Number(tmdbRating.toFixed(1))
  }

  let cineWeight: number

  if (cineChanceVotes < TRANSITION_VOTES) {
    // Для малого количества голосов — формула IMDB с m=2
    // Это даёт быстрое влияние при росте сообщества
    cineWeight = cineChanceVotes / (cineChanceVotes + IMDB_M)
  } else {
    // Для большого количества голосов — сравнение голосов
    const totalVotes = cineChanceVotes + tmdbVotes
    cineWeight = cineChanceVotes / totalVotes
  }

  // Применяем ограничения: минимум 15% и максимум 80%
  cineWeight = Math.max(MIN_CINE_WEIGHT, Math.min(MAX_CINE_WEIGHT, cineWeight))

  // Вычисляем взвешенный рейтинг
  const tmdbWeight = 1 - cineWeight
  const score = cineWeight * cineChanceRating + tmdbWeight * tmdbRating

  return Number(score.toFixed(1))
}
