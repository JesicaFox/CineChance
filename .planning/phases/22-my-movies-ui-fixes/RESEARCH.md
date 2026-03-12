# Research: My Movies UI Fixes (Scroll-to-Top + Hide Index)

## Точки интеграции

### Кнопка "Вернуться на верх" (Scroll-to-Top)
- **`src/app/search/SearchClient.tsx`** (строки 37, 109-115, 177-198) — эталонная реализация:
  - Состояние `showScrollTop` управляется через `useEffect` с `scroll` event listener
  - Кнопка показывается при `window.scrollY > 300`
  - Fixed позиционирование: `bottom-6 right-6`, round-full, blue-600
  - SVG иконка стрелки вверх

- **`src/app/my-movies/MyMoviesContentClient.tsx`** — целевой файл, нужно добавить:
  - Scroll tracking logic (аналогично SearchClient)
  - Кнопка "Наверх" в рендере (вынести из conditional рендеринга результатов)

### Скрытие порядкового номера (Serial Number Index)
- **`src/app/components/MovieCard.tsx`** (строки 119-124, 686-690) — уже имеет `index` prop и conditionally рендерит номер:
  ```typescript
  index?: number; // 0-based index
  // ...
  {index !== undefined && (
    <div className="absolute -top-1 right-1 z-20 bg-amber-900/40 ...">
      <span>{Math.floor(index) + 1}</span>
    </div>
  )}
  ```

- **`src/app/components/FilmGridWithFilters.tsx`** (строка 357) — передает `index` в MovieCard:
  ```typescript
  <MovieCard
    // ...
    index={index}
  />
  ```

- **`src/app/components/__tests__/FilmGridWithFilters.orderNumbers.test.tsx`** — существующие тесты ожидают что порядковые номера видны. Нужно либо:
  - Адаптировать тесты под скрытие номеров на my-movies
  - Либо добавить флаг `showIndex` в FilmGridWithFilters и проверять его в тестах

### Использование FilmGridWithFilters
Компонент используется в 4 местах:
1. `src/app/my-movies/MyMoviesContentClient.tsx` — **цель для скрытия индекса**
2. `src/app/stats/tags/[tagId]/TagDetailClient.tsx` — вероятно, оставить индексы
3. `src/app/stats/ratings/[rating]/RatingDetailClient.tsx` — вероятно, оставить индексы
4. `src/app/stats/genres/[genre]/GenreDetailClient.tsx` — вероятно, оставить индексы

## Существующие типы для переиспользования

### MovieCardProps (src/app/components/MovieCard.tsx)
```typescript
interface MovieCardProps {
  movie: Media;
  restoreView?: boolean;
  initialIsBlacklisted?: boolean;
  initialStatus?: MediaStatus;
  showRatingBadge?: boolean;
  priority?: boolean;
  initialUserRating?: number | null;
  initialWatchCount?: number;
  initialAverageRating?: number | null;
  initialRatingCount?: number;
  /** 0-based index of the movie in the list. Displayed as order number +1 */
  index?: number;
}
```

**Тип Media** (из `@/lib/tmdb`) уже определен и используется повсеместно.

## Новые типы которые нужно создать

### FilmGridWithFiltersProps — добавить проп `showIndex`
В `src/app/components/FilmGridWithFilters.tsx` нужно добавить опциональный проп:

```typescript
export interface FilmGridWithFiltersProps {
  // ... существующие пропсы ...

  /** Показывать ли порядковые номера на карточках фильмов */
  showIndex?: boolean; // default: true
}
```

Использование внутри компонента:
```typescript
<MovieCard
  movie={movie}
  // ...
  index={showIndex ? index : undefined}
/>
```

**Обоснование**: Прямое удаление `index` из рендера сломает обратную совместимость. Флаг `showIndex` позволяет:
- By default сохранить текущее поведение (индексы видны)
- Отключить индексы selectively на странице /my-movies
- Легко вернуть в будущем через `showIndex={true}`

## Архитектурный паттерн продукта

### Client-side Scroll Tracking Pattern (из SearchClient.tsx)
- Используется `useState` + `useEffect` с `window.addEventListener('scroll', handler)`
- Очистка listener в return функции
- `window.scrollY` порог 300px для показа кнопки
- Fixed позиционирование с `z-50` для поверхностного отображения
- Плавная анимация `behavior: 'smooth'`

### Conditional Rendering Pattern для MovieCard
- `index` передается как необязательный prop
- MovieCard рендерит номер только если `index !== undefined`
- Это позволяет selectively включать/выключать функциональность без изменения MovieCard

### Shared Component Pattern (FilmGridWithFilters)
- Универсальный компонент сетки фильмов с фильтрацией
- Используется на 4 различных страницах (my-movies + 3 stats pages)
- Принимает callback `fetchMovies` для кастомной загрузки данных
- Управляет собственным состоянием фильтров и пагинации
- Props: `availableGenres`, `userTags`, `showRatingBadge`, `getInitialStatus`, `restoreView`, и т.д.

## Риски

### Риск 1: Сломанные тесты после добавления `showIndex`
**Описание**: Существующие тесты `FilmGridWithFilters.orderNumbers.test.tsx` ожидают, что порядковые номера 1, 2, 3 будут отображаться. После добавления `showIndex` по умолчанию true — тесты должны продолжать работать. Но если поменяем логику рендера, тесты упадут.

**Митигация**:
- Добавить `showIndex={true}` явно в тестах (или не передавать, так как default true)
- Обновить тесты только если меняем поведение по умолчанию (не планируется)

### Риск 2: Неправильные ожидания на stats страницах
**Описание**: Неизвестно, нужны ли порядковые номера на страницах статистики (tags, ratings, genres). При скрытии только на my-movies, на stats останутся видимыми.

**Митигация**:
- Требуется уточнение у заказчика/дизайнера
- Если на stats тоже нужно скрыть — передавать `showIndex={false}` и туда
- Решение: пока скрываем только на my-movies, как указано в задании

### Риск 3: Дублирование кода scroll-to-top
**Описание**: Код кнопки "Наверх" будет скопирован из SearchClient.tsx в MyMoviesContentClient.tsx, что создаст дублирование.

**Митигация**:
- В будущем можно вынести в отдельный хук `useScrollToTop()` или компонент `ScrollToTopButton`
- Пока оставляем дублирование, так как это небольшая функция (15-20 строк)
- Обновить knowledge.md с улучшением на будущее

### Риск 4: Утечка памяти при неправильном useEffect cleanup
**Описание**: Scroll event listener должен корректно очищаться при unmount.

**Митигация**:
- Следовать паттерну из SearchClient (чистый useEffect с return cleanup)
- Протестировать навигацию между страницами

## Рекомендуемая структура файлов

```
src/app/my-movies/MyMoviesContentClient.tsx  # Изменения:
  1. Добавить useState<boolean> для showScrollTop
  2. Добавить useEffect для scroll tracking
  3. Добавить кнопку "Наверх" в рендер (после FilmGridWithFilters или внутри контейнера)
  4. Передать showIndex={false} в FilmGridWithFilters

src/app/components/FilmGridWithFilters.tsx   # Изменения:
  1. Добавить showIndex?: boolean в интерфейс FilmGridWithFiltersProps
  2. В рендере MovieCard: index={showIndex ? index : undefined}

src/app/components/__tests__/FilmGridWithFilters.orderNumbers.test.tsx  # Возможные изменения:
  - Явно передавать showIndex={true} в тестах для гарантии
  - Или ничего не менять (default true)

src/app/stats/tags/[tagId]/TagDetailClient.tsx   # Без изменений (default showIndex=true)
src/app/stats/ratings/[rating]/RatingDetailClient.tsx # Без изменений
src/app/stats/genres/[genre]/GenreDetailClient.tsx # Без изменений
```

## Что НЕ трогать

- **`src/app/components/MovieCard.tsx`** — не менять логику рендеринга `index`, она уже корректна (`index !== undefined && (...)`). Мы просто контролируем передаваемый value из FilmGridWithFilters.

- **`src/app/search/SearchClient.tsx`** — кнопка "Наверх" там уже есть, не трогать.

- **`src/app/search/page.tsx`** — не относится к задаче.

- **API endpoints** (`/api/my-movies`, `/api/stats/*`) — не нужно менять, это чисто UI изменения.

- **Статистические страницы** (tags, ratings, genres) — пока не трогать, оставить индексы видимыми.

- **Prisma schema** — не требуется изменений.

- **Типы и интерфейсы** — только добавляем `showIndex?: boolean` в FilmGridWithFiltersProps, все остальное существует.

## Вопросы для уточнения

1. Нужно ли также скрывать индексы на страницах статистики (tags, ratings, genres)?
2. Должна ли кнопка "Наверх" иметь тот же exact styling, что и на странице поиска?
3. Требуется ли тест на скрытие индексов на my-movies? Если да — нужно создать новый тестовый файл.

## Ссылки на код

- Эталонная кнопка: `src/app/search/SearchClient.tsx:177-198`
- Scroll logic: `src/app/search/SearchClient.tsx:37, 109-115`
- MovieCard index: `src/app/components/MovieCard.tsx:686-690`
- FilmGridWithFilters рендер MovieCard: `src/app/components/FilmGridWithFilters.tsx:343-361`
- Существующие тесты: `src/app/components/__tests__/FilmGridWithFilters.orderNumbers.test.tsx`
