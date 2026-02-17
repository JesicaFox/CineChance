# 2026-02-16 Фильтры Аниме и Мульт на всех страницах

## Описание
Добавлен фильтр "Мульты" (Cartoon) на страницы:
- Мои фильмы
- Поиск
- Подробная статистика (по жанрам, рейтингам, тегам)

Также исправлены баги с некорректной работой фильтров Аниме/Мульт.

## Проблемы

### 1. Фильтр Аниме показывал пустую страницу на "Мои фильмы"
**Причина:** Логика фильтрации была некорректной. При выборе только "Аниме" не срабатывала фильтрация.
**Решение:** Переписана логика с использованием `else if` цепочки для гарантии обработки только одного типа контента.

### 2. Постеры дублировались бесконечно
**Причина:** Пагинация работала неправильно - `hasMore` вычислялся на основе `totalCount` (все записи в БД), а не отфильтрованных.
**Решение:** Добавлена правильная пагинация с использованием slice и пересчётом `hasMore` на основе отфильтрованных данных.

### 3. Ошибка 429 на странице поиска
**Причина:** При изменении фильтров типа контента отправлялось слишком много запросов, что приводило к превышению rate limit.
**Решение:** 
- Добавлен debounce 500ms при изменении фильтров
- Увеличен rate limit для `/api/search` со 100 до 150 запросов в минуту

### 4. API поиска не поддерживал фильтр cartoon
**Причина:** API обрабатывал только 'movie', 'tv', 'anime', но не 'cartoon'.
**Решение:** Добавлена фильтрация для 'cartoon' - анимация (genre 16) с НЕ японским языком.

## Реализация

### Логика определения типа контента (TMDB)
```typescript
// Аниме: Animation genre (16) + японский язык
function isAnime(movie: any): boolean {
  const hasAnimeGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  return hasAnimeGenre && movie.original_language === 'ja';
}

// Мульты: Animation genre (16) + НЕ японский язык  
function isCartoon(movie: any): boolean {
  const hasAnimationGenre = movie.genres?.some((g: any) => g.id === 16) ?? false;
  return hasAnimationGenre && movie.original_language !== 'ja';
}
```

### Изменённые файлы

#### UI компоненты
- `src/app/my-movies/FilmFilters.tsx` - добавлена кнопка "Мульты"
- `src/app/components/FilmGridWithFilters.tsx` - добавлена поддержка showCartoon
- `src/app/search/SearchFilters.tsx` - добавлена кнопка "Мульты", debounce
- `src/app/my-movies/MyMoviesContentClient.tsx` - передача types в API
- `src/app/search/SearchClient.tsx` - debounce фильтров

#### API маршруты статистики
- `src/app/api/stats/movies-by-genre/route.ts`
- `src/app/api/stats/movies-by-rating/route.ts`
- `src/app/api/stats/movies-by-tag/route.ts`
- `src/app/api/my-movies/route.ts`
- `src/app/api/search/route.ts`

#### API клиенты статистики
- `src/app/stats/genres/[genre]/GenreDetailClient.tsx`
- `src/app/stats/ratings/[rating]/RatingDetailClient.tsx`
- `src/app/stats/tags/[tagId]/TagDetailClient.tsx`

### Rate Limit конфигурация
```typescript
'/api/search': { points: 150, duration: 60 }, // 150 запросов в минуту
```

## Предотвращение
- Использовать debounce (300-500ms) при любых пользовательских фильтрах
- Всегда тестировать фильтрацию с разными комбинациями
- Проверять пагинацию при фильтрации - она должна основываться на отфильтрованных данных, а не на общем количестве
