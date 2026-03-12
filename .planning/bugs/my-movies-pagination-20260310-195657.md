# Bug: My Movies - Ограничение в 100 фильмов на вкладку
Дата: 2026-03-10

## Описание
На странице "Мои фильмы" (/my-movies) при загрузке без фильтров отображается только 100 фильмов на каждой вкладке (Просмотрено, Хочу посмотреть, Брошено). При прокрутке вниз подгружаются ещё фильмы, но общий лимит составляет 100 записей, после чего загрузка прекращается (hasMore становится false). Это происходит даже если у пользователя в коллекции более 100 фильмов.

Ожидается: При отсутствии фильтров система должна корректно реализовать бесконечную пагинацию, загружая все фильмы пользователя по 20 штук на страницу, без искусственных лимитов.

## Шаги воспроизведения
1. Войти в систему как пользователь с более чем 100 фильмами в любом статусе (Просмотрено/Хочу посмотреть/Брошено)
2. Перейти на страницу /my-movies
3. Выбрать вкладку с большим количеством фильмов (>100)
4. Прокрутить вниз до загрузки всех фильмов
5. Наблюдать: после загрузки ~100 фильмов подгрузка прекращается, хотя фильмов остаётся больше

## Ожидаемое поведение
- При отсутствии TMDB-фильтров (типы контента, жанры, год) должна использоваться классическая пагинация с skip/take
- Должны загружаться все фильмы пользователя с выбранным статусом, по 20 на страницу
- hasMore должен правильно отражать наличие дальнейших страниц
- Никаких жёстких лимитов (100, 1000) при отсутствии необходимости fetch-all

## Фактическое поведение
- Для regular tabs (watched, wantToWatch, dropped) используется стратегия "fetch-all-with-buffer"
- BUFFER_SIZE = 100 при отсутствии фильтров, 1000 при наличии TMDB-фильтров
- Нет использования skip для пагинации, всегда fetch с skip=0, take=BUFFER_SIZE
- Это приводит к ограничению в 100 фильмов даже если фильмов значительно больше

## Локализация
- **Файлы:** `src/app/api/my-movies/route.ts`
- **Функция/компонент:** GET endpoint, секция обработки regular tabs (строки 309-519)
- **Предполагаемая причина:** Использование неправильной стратегии пагинации - всегда fetch-all с фиксированным буфером вместо ветвления на skip/take для простых случаев без TMDB-фильтров

## Root Cause Analysis

### Архитектурная проблема
Код в `route.ts` для regular tabs (строки 309-519) использует:
```typescript
// Always fetch from start with fixed buffer (строки 354-371)
watchListRecords = await prisma.watchList.findMany({
  where: whereClauseWithRating,
  orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
  take: BUFFER_SIZE, // 100 или 1000, skip отсутствует
});
```

В то время как для hidden tab (строки 153-189) уже реализовано правильное ветвление:
```typescript
if (hasTMDBFilters) {
  // fetch all then filter
} else {
  // proper pagination: skip/take
  const pageSkip = (page - 1) * limit;
  const pageTake = limit + 1;
  // ... count + findMany with skip/take
}
```

### Почему требуется ветвление
**Для TMDB-фильтров (types, genres, year) действительно нужно fetch-all-then-filter**:
- Типы контента (anime/cartoon/movie/tv) определяются на основе `genre_ids` и `original_language` из TMDB
- Фильтр по жанрам требует `genre_ids` из TMDB
- Фильтр по году требует года из `release_date`/`first_air_date` из TMDB
- Эти данные отсутствуют в WatchList таблице, требуется внешний запрос к TMDB API

**Для отсутствия TMDB-фильтров достаточно DB-level пагинации**:
- Рейтинг фильтруется через WHERE clause на уровне Prisma (ratingFilter)
- Статус уже в whereClause
- Остальные поля для сортировки (addedAt, id, vote_average, userRating) есть в WatchList
- Не требуется TMDB данные → можно использовать skip/take

### Почему BUFFER_SIZE=100 проблематичен
1. **Жёсткий лимит** - пользователи с >100 фильмами никогда не увидят всё коллекцию
2. **Неэффективно** - загружает лишние записи (101 вместо ровно 20 для страницы)
3. **Ограничивает hasMore** - hasMore = sortedMovies.length > pageEndIndex, но sortedMovies ограничен буфером

### hasMore и totalCount Calculation
Текущий код (стр. 500, 518):
```typescript
const hasMore = sortedMovies.length > pageEndIndex;
totalCount: sortedMovies.length;
```
- Для skip/take case это было бы неверно (даёт размер текущей страницы)
- Для buffer case технически верно, но ограничено размером буфера

## Acceptance критерии исправления

### Функциональные требования
- [ ] При отсутствии TMDB-фильтров используется DB-level пагинация с skip/take
- [ ] При активных TMDB-фильтрах используется fetch-all-then-filter с буфером 5000 (вместо 1000)
- [ ] Первая страница (page=1) без фильтров возвращает ровно 20 фильмов (не 101)
- [ ] hasMore корректно отражает наличие следующих страниц:
  - Для skip/take: `skip + limit < totalCount`
  - Для buffer: `filteredMovies.length > pageEndIndex`
- [ ] totalCount возвращает:
  - Для skip/take: `totalCount` из DB count query
  - Для buffer: `filteredMovies.length` (но не более BUFFER_SIZE)
- [ ] Никаких дубликатов фильмов между страницами
- [ ] Secondary sort by ID стабилен на всех страницах

### Производительность
- [ ] Для skip/take case запросы к БД используют skip/take (не загружаются лишние записи)
- [ ] Для buffer case BUFFER_SIZE увеличен до 5000 для покрытия возможных фильтраций
- [ ] В логах видно, какая стратегия используется (debug log)

### Регрессия
- [ ] Существующие тесты проходят
- [ ] Фильтры (anime/cartoon, жанры, год, рейтинг) работают как раньше
- [ ] Сортировка работает корректно на всех страницах
- [ ] Hidden tab (черный список) продолжает работать (уже использует правильную пагинацию)

## Spec для RED теста

### Unit/Integration Test Plan

**Название теста:** `my-movies pagination without TMDB filters loads all movies using skip/take`

**Файл теста:** `src/app/api/my-movies/__tests__/pagination.test.ts` (новый или расширение существующего)

**Предусловия:**
1. Создать тестового пользователя
2. Создать 150 записей в WatchList для этого пользователя со статусом "Просмотрено"
3. Никакие фильмы не имеют genre_ids=16 (anime) для упрощения
4. Все записи имеют разные даты addedAt (для тестирования сортировки)

**Шаги:**
```typescript
describe('Pagination without TMDB filters', () => {
  it('should load all 150 movies across 8 pages (20 per page, last page 10)', async () => {
    // Page 1
    const page1 = await fetch('/api/my-movies?page=1&limit=20&statusName=Просмотрено');
    expect(page1.movies).toHaveLength(20);
    expect(page1.hasMore).toBe(true);
    
    // Page 2
    const page2 = await fetch('/api/my-movies?page=2&limit=20&statusName=Просмотрено');
    expect(page2.movies).toHaveLength(20);
    expect(page2.hasMore).toBe(true);
    
    // ... continue to page 8
    
    // Collect all movies
    const allMovies = [];
    for (let p = 1; p <= 8; p++) {
      const res = await fetch(`/api/my-movies?page=${p}&limit=20&statusName=Просмотрено`);
      const data = await res.json();
      allMovies.push(...data.movies);
    }
    
    // Should have all 150 unique movies
    expect(allMovies).toHaveLength(150);
    const uniqueIds = new Set(allMovies.map(m => m.id));
    expect(uniqueIds.size).toBe(150);
    
    // Should be properly ordered by addedAt desc
    for (let i = 1; i < allMovies.length; i++) {
      expect(new Date(allMovies[i-1].addedAt).getTime())
        .toBeGreaterThanOrEqual(new Date(allMovies[i].addedAt).getTime()));
    }
  });
  
  it('should use skip/take in DB query (verify with query log or mock)', async () => {
    // Mock Prisma and verify skip = (page-1)*limit
  });
});
```

**Ожидаемый результат:** Тест должен ПАДАТЬ на текущем коде, потому что:
- При page=2 вернётся всё равно первые 100 записей (буфер), а не следующие 20
- Всего можно получить максимум 100 фильмов из 150
- hasMore станет false преждевременно

## Минимальное зелёное исправление (GREEN)

### Файл: `src/app/api/my-movies/route.ts`

**Изменения в секции regular tabs (строки ~309-519):**

1. **Пересмотреть определение hasFilters:**
   ```typescript
   // Текущее (стр. 343):
   const hasFilters = hasTMDBFilters || minRating > 0 || maxRating < 10 || yearFrom || yearTo;
   
   // Должно быть:
   const hasTMDBBasedFilters = hasTMDBFilters; // только TMDB-фильтры
   // Рейтинг фильтр не требует fetch-all, т.к. есть в WHERE
   ```

2. **Ветвление с двумя стратегиями:**
   `
