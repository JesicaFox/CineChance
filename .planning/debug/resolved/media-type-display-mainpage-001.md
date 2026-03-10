# Bug Report: Неправильный отображение типа контента на главной странице (RESOLVED)

## Описание
На главной странице у карточки фильма в верхней плашке отображается только "Фильм", даже для контента который должен быть:
- Мультфильм (анимация non-Japanese)
- Аниме (японская анимация)
- Сериал (TV)

## Root Cause Analysis
1. **`fetchTrendingMovies` запрашивал только `/trending/movie/`** — не включал TV шоу
2. **В преобразовании данных отсутствовали критичные поля:**
   - `genre_ids` (нужен для определения аниме/мультов)
   - `original_language` (нужен для определения аниме)
3. Поэтому `getMediaTypeDisplay` всегда возвращал "Фильм"

## Fix Applied

### 1. `src/lib/tmdb.ts`
- **`fetchTrendingMovies`**: теперь делает параллельные запросы к `/trending/movie/{window}` и `/trending/tv/{window}`
- **`fetchPopularMovies`**: аналогично к `/movie/popular` и `/tv/popular`
- **`transformToMedia`**: добавлены поля `genre_ids` и `original_language` в возвращаемый объект
- **JSDoc**: добавлен для функций с описанием логики

### 2. `src/lib/mediaType.ts`
- **JSDoc**: обновлён с объяснением логики определения типа контента

### 3. `src/lib/__tests__/mediaType-bug.test.ts`
- Создан тест для верификации правильного определения типов

## Files Changed
- `src/lib/tmdb.ts`
- `src/lib/mediaType.ts`  
- `src/lib/__tests__/mediaType-bug.test.ts` (new)

## Verification
- Тесты: 157 passed / 0 failed
- TypeScript: чисто
- ESLint: чисто

## Resolution Date
2025-03-07

## Status
✅ RESOLVED
