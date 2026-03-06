# Bug Report: Неправильный отображение типа контента на главной странице

## Описание
На главной странице у карточки фильма в верхней плашке отображается только "Фильм", даже для контента который должен быть:
- Мультфильм (анимация non-Japanese)
- Аниме (японская анимация)
- Сериал (TV)

Шаблон: `src/app/components/MovieCard.tsx` (строки 604-611) использует `getMediaTypeDisplay(movie).label`.

## Локализация

### Файлы, связанные с проблемой:
1. `src/lib/tmdb.ts` - `fetchTrendingMovies` (стр. 102-165) и `fetchPopularMovies` (стр. 167-228)
2. `src/lib/mediaType.ts` - `getMediaTypeDisplay` (стр. 16-32)
3. `src/app/components/HorizontalMovieGridServer.tsx` - загрузка данных для главной страницы (стр. 2, 102)

### Root Cause Analysis:
1. **`fetchTrendingMovies` запрашивает только `/trending/movie/`** (стр. 118), но должен запрашивать и TV тоже.
2. **В преобразовании данных `fetchTrendingMovies` отсутствуют критичные поля:**
   - `genre_ids` (нужен для определения аниме/мультов)
   - `original_language` (нужен для определения аниме)
3. Поэтому `getMediaTypeDisplay` не может правильно определить тип:
   - Все элементы имеют `media_type: 'movie'` → всегда "Фильм"
   - Нет `genre_ids` → не может определить анимацию
   - Нет `original_language` → не может отличить аниме от мульта

### Аналогичная проблема в `fetchPopularMovies`:
Тот же самый pattern: запрашивает только `/movie/popular` и не передает `genre_ids` и `original_language`.

## Spec для RED теста

Тест должен воспроизвести баг, проверяя что `getMediaTypeDisplay` возвращает правильный label для различных типов медиа.

**Сценарий:**
1. Создать mock `Media` объекты с разными комбинациями:
   - Movie с `media_type: 'movie'`, `genre_ids: [16]`, `original_language: 'ja'` → должен быть 'Аниме' (ошибка: будет 'Фильм')
   - Movie с `media_type: 'movie'`, `genre_ids: [16]`, `original_language: 'en'` → должен быть 'Мульт' (ошибка: будет 'Фильм')
   - TV show с `media_type: 'tv'` (даже без анимации) → должен быть 'Сериал' (ошибка: будет 'Фильм' из-за запроса только movie)
   - Movie без анимации → 'Фильм' (правильно)

2. Проверить что функция возвращает неправильные значения для первых трех случаев.

**Пример теста (Vitest):**

```typescript
import { getMediaTypeDisplay } from '@/lib/mediaType';
import type { Media } from '@/lib/tmdb';

describe('getMediaTypeDisplay - bug reproduction', () => {
  it('should return "Аниме" for Japanese animation movie', () => {
    const media: Media = {
      id: 1,
      media_type: 'movie',
      title: 'Аниме',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      genre_ids: [16], // Animation
      original_language: 'ja',
    };
    const result = getMediaTypeDisplay(media);
    expect(result.label).toBe('Аниме'); // Будет 'Фильм' из-за бага
  });

  it('should return "Мульт" for non-Japanese animation', () => {
    const media: Media = {
      id: 2,
      media_type: 'movie',
      title: 'Мульт',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      genre_ids: [16],
      original_language: 'en',
    };
    const result = getMediaTypeDisplay(media);
    expect(result.label).toBe('Мульт'); // Будет 'Фильм'
  });

  it('should return "Сериал" for TV show', () => {
    const media: Media = {
      id: 3,
      media_type: 'tv',
      name: 'Сериал',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      genre_ids: [],
      original_language: 'en',
    };
    const result = getMediaTypeDisplay(media);
    expect(result.label).toBe('Сериал'); // Будет 'Фильм' из-за проверки movie
  });
});
```

**Примечание:** На самом деле, для TV third test должен проходить, если передать `media_type: 'tv'`. Но по факту на главной странице никогда не передается 'tv', потому что `fetchTrendingMovies` берет только movie. Поэтому все карточки на главной будут "Фильм".

## Вопросы для уточнения:
1. Нужно ли на главной странице показывать и фильмы и сериалы? (предполагаю ДА)
2. Нужно ли исправлять только `fetchTrendingMovies` или также `fetchPopularMovies`? (предполагаю оба)
3. Ожидается ли что аниме/мультфильмы определятся по жанру? (да, жанр 16 - Animation)

## Предполагаемое исправление:
1. В `fetchTrendingMovies` и `fetchPopularMovies`:
   - Запрашивать и movie и tv (либо через два запроса, либо через multi endpoint если есть)
   - Включить `genre_ids` и `original_language` в преобразование
2. Убедиться что `HorizontalMovieGridServer` корректно объединяет данные (если нужно)

---
Bug ID: media-type-display-mainpage-001
Created: 2025-03-07
Priority: High
Status: Open
