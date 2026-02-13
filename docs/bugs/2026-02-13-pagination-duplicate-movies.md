# Bug Fix: Пагинация дублирует фильмы

## Описание
При пагинации на странице "Мои фильмы" и на страницах подробной статистики (`/stats/genres/[genre]`, `/stats/ratings/[rating]`, `/stats/tags/[tagId]`) происходило дублирование уже загруженных фильмов в бесконечном цикле.

## Root Cause
Во всех файлах была сломана логика пагинации:
```typescript
// БЫЛО (оригинальный код):
const recordsNeeded = Math.ceil(page * limit * 1.5) + 1;
const skip = 0; // Always from beginning for deterministic results
const take = Math.min(recordsNeeded, 500);
```

Проблемы:
1. `skip = 0` ВСЕГДА - означало что каждая страница загружала данные с начала
2. `take` увеличивался с каждой страницей (31, 61, 91...), но данные всегда брались с начала
3. Это приводило к тому, что срез возвращал те же данные

Также, согласно документации Prisma, при использовании `orderBy` по полю с неуникальными значениями происходит неконсистентная сортировка.

**Источник:** [Prisma GitHub Issue #23615](https://github.com/prisma/prisma/issues/23615)

## Решение

### 1. Исправлена логика пагинации
```typescript
// СТАЛО:
const skip = (page - 1) * limit;
const take = limit;
```

### 2. Исправлен hasMore
```typescript
// Было:
const hasMore = sortedMovies.length > pageEndIndex || watchListRecords.length === take;

// Стало:
const hasMore = sortedMovies.length > pageEndIndex;
```

### 3. Добавлен `id` как вторичный критерий сортировки
```typescript
orderBy: [{ field: 'desc' }, { id: 'desc' }]
```

## Исправленные файлы

1. **`src/app/api/my-movies/route.ts`**
   - Исправлена логика пагинации (правильный skip/take)
   - Исправлен hasMore calculation
   - Blacklist query: добавлен `id` в orderBy

2. **`src/app/my-movies/actions.ts`**
   - WatchList query: добавлен `id` в orderBy
   - Blacklist query: добавлен `id` в orderBy
   - `sortMoviesOnServer`: добавлен secondary sort по id

3. **`src/app/api/stats/movies-by-genre/route.ts`**
   - Исправлена логика пагинации
   - Исправлен hasMore calculation
   - Добавлен `id` в orderBy

4. **`src/app/api/stats/movies-by-rating/route.ts`**
   - Исправлена логика пагинации
   - Исправлен hasMore calculation
   - Обновлена функция `getBenefitsOrder` для добавления `id` в orderBy

5. **`src/app/api/stats/movies-by-tag/route.ts`**
   - Исправлена логика пагинации
   - Исправлен hasMore calculation
   - Обновлена функция `getBenefitsOrder` для добавления `id` в orderBy

6. **`src/app/api/logs/stats/route.ts`**
   - Добавлен `id` в orderBy для sample queries

7. **`src/app/api/debug/stats/route.ts`**
   - Добавлен `id` в orderBy

8. **`src/app/api/debug/real-status-ids/route.ts`**
   - Добавлен `id` в orderBy

9. **`src/app/actions/tagsActions.ts`**
   - Добавлен `id` в orderBy

## Status
✅ ИСПРАВЛЕНО

## Prevention
Все future запросы с пагинацией должны использовать правильный skip:
```typescript
const skip = (page - 1) * limit;
const take = limit;
```

При JavaScript сортировке всегда добавлять:
```typescript
if (comparison === 0) {
  comparison = a.id - b.id;
}
```

Проблемы:
1. `skip = 0` ВСЕГДА - означало что каждая страница загружала данные с начала
2. `take` увеличивался с каждой страницей (31, 61, 91...), но данные всегда брались с начала
3. JavaScript сортировка (`sortMovies`) отличалась от БД сортировки (`orderBy: addedAt`)
4. Это приводило к тому, что срез `sortedMovies.slice(pageStart, pageEnd)` возвращал те же данные

Также, согласно документации Prisma, при использовании `orderBy` по полю с неуникальными значениями происходит неконсистентная сортировка.

**Источник:** [Prisma GitHub Issue #23615](https://github.com/prisma/prisma/issues/23615)

## Решение

### 1. Исправлена логика пагинации
```typescript
// СТАЛО:
const skip = (page - 1) * limit;
take: limit;
```

### 2. Исправлен hasMore
```typescript
// Было (неправильно):
const hasMore = sortedMovies.length > pageEndIndex || watchListRecords.length === take;

// Стало (правильно):
const hasMore = totalCount > (page * limit);
```

### 3. Добавлен `id` как вторичный критерий сортировки
```typescript
orderBy: [{ addedAt: 'desc' }, { id: 'desc' }]
```

### 4. Добавлен secondary sort в JavaScript функции сортировки
```typescript
if (comparison === 0) {
  comparison = a.id - b.id;
}
```

## Исправленные файлы

1. **`src/app/api/my-movies/route.ts`**
   - Исправлена логика пагинации (правильный skip/take)
   - Исправлен hasMore calculation
   - Blacklist query: добавлен `id` в orderBy
   - `sortMovies`: добавлен secondary sort по id

2. **`src/app/my-movies/actions.ts`**
   - WatchList query: добавлен `id` в orderBy
   - Blacklist query: добавлен `id` в orderBy
   - Исправлен `hasMore` calculation
   - `sortMoviesOnServer`: добавлен secondary sort по id

## Status
✅ ИСПРАВЛЕНО - пагинация работает корректно (20 фильмов на страницу)

## Prevention
Все future запросы с пагинацией должны использовать правильный skip:
```typescript
const skip = (page - 1) * limit;
const take = limit;
```

При JavaScript сортировке всегда добавлять:
```typescript
if (comparison === 0) {
  comparison = a.id - b.id;
}
```

Проблемы:
1. `skip = 0` ВСЕГДА - означало что каждая страница загружала данные с начала
2. `take` увеличивался с каждой страницей (31, 61, 91...), но данные всегда брались с начала
3. JavaScript сортировка (`sortMovies`) отличалась от БД сортировки (`orderBy: addedAt, id`)
4. Это приводило к тому, что срез `sortedMovies.slice(pageStart, pageEnd)` возвращал те же данные

Также, согласно документации использовании `order Prisma, приBy` по полю с неуникальными значениями происходит неконсистентная сортировка.

**Источник:** [Prisma GitHub Issue #23615](https://github.com/prisma/prisma/issues/23615)

## Решение
1. Исправлена пагинация:
```typescript
// СТАЛО:
const skip = (page - 1) * limit;
const take = limit + 1; // +1 to detect hasMore
```

2. Добавлен `id` как вторичный критерий сортировки для стабильного порядка:
```typescript
orderBy: [{ addedAt: 'desc' }, { id: 'desc' }]
```

3. Добавлен secondary sort в JavaScript функции сортировки.

## Исправленные файлы

1. **`src/app/api/my-movies/route.ts`**
   - Исправлена логика пагинации (skip/take)
   - Blacklist query: добавлен `id` в orderBy
   - `sortMovies`: добавлен secondary sort по id

2. **`src/app/my-movies/actions.ts`**
   - WatchList query: добавлен `id` в orderBy
   - Blacklist query: добавлен `id` в orderBy
   - Исправлен `hasMore` calculation
   - `sortMoviesOnServer`: добавлен secondary sort по id

## Prevention
Все future запросы с пагинацией должны использовать правильный skip:
```typescript
const skip = (page - 1) * limit;
const take = limit + 1;
```
