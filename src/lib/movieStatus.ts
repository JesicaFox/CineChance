// src/lib/movieStatus.ts
/**
 * Временная функция для генерации случайных статусов фильма
 * В будущем будет заменена на проверку в базе данных
 */
export type MovieStatus = 'want' | 'watched' | 'dropped' | null;

// Хранилище для тестирования (в будущем заменится на запрос к БД)
const movieStatuses = new Map<number, MovieStatus>();

export const getMovieStatus = (movieId: number): MovieStatus => {
  // Для тестирования генерируем случайный статус на основе ID фильма
  // Это создаст детерминированный, но "случайный" статус для каждого фильма
  const statuses: (MovieStatus)[] = [null, 'want', 'watched', 'dropped'];
  const index = movieId % 4; // Используем остаток от деления на 4
  
  // Проверяем, есть ли уже сохраненный статус
  if (movieStatuses.has(movieId)) {
    return movieStatuses.get(movieId)!;
  }
  
  // Генерируем и сохраняем статус для этого фильма
  const status = statuses[index];
  movieStatuses.set(movieId, status);
  return status;
};

export const setMovieStatus = (movieId: number, status: MovieStatus): void => {
  movieStatuses.set(movieId, status);
};