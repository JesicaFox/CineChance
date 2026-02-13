# Bug Fix: Пагинация дублирует фильмы

## Описание
При пагинации на странице "Мои фильмы" происходило дублирование уже загруженных фильмов.

## Root Cause
Согласно документации Prisma, при использовании `orderBy` по полю с неуникальными значениями (например, `addedAt` - дата добавления может быть одинаковой для нескольких фильмов), происходит неконсистентная сортировка. Это приводит к тому, что одни и те же записи могут появляться на разных страницах.

**Источник:** [Prisma GitHub Issue #23615](https://github.com/prisma/prisma/issues/23615)

## Решение
Добавлен `id` как вторичный критерий сортировки для обеспечения стабильного порядка:

```typescript
// Было
orderBy: { addedAt: 'desc' }

// Стало  
orderBy: [{ addedAt: 'desc' }, { id: 'desc' }]
```

## Исправленные файлы

1. **`src/app/my-movies/actions.ts`**
   - WatchList query (строка 125)
   - Blacklist query (строка 190)
   - Исправлен `hasMore` calculation (строка 109) - использовался `ITEMS_PER_PAGE` вместо переданного `limit`

2. **`src/app/api/my-movies/route.ts`**
   - WatchList query (строка 280)

## Prevention
Все future запросы с пагинацией должны использовать множественный `orderBy`:
```typescript
orderBy: [{ field1: 'desc' }, { id: 'desc' }]
```
