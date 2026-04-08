# Нормализация жанров TMDB в WatchList

## Обзор

TMDB возвращает комбинированные жанры для сериалов:
- `10759` → "Action & Adventure" (должно быть Action + Adventure)
- `10765` → "Sci-Fi & Fantasy" (должно быть Science Fiction + Fantasy)
- `10768` → "War & Politics" (должно быть War + Western)

Эта реализация разделяет комбинированные жанры на базовые 19 жанров TMDB.

## Файлы проекта

### 1. Справочник жанров: `src/lib/tmdb-genres.ts`

Содержит:
- **Список 19 базовых жанров TMDB**
- **Маппинг комбинированных ID** к их компонентам
- **Утилиты нормализации**

**Основные функции:**
```typescript
// Нормализовать жанры (разделить комбинированные)
const normalized = normalizeGenres([
  { id: 10759, name: "Action & Adventure" },
  { id: 18, name: "Drama" }
]);
// Результат: [
//   { id: 28, name: "Action" },
//   { id: 12, name: "Adventure" },
//   { id: 18, name: "Drama" }
// ]

// Проверить наличие комбинированных жанров
const isComposite = isCompositeGenre(10759); // true

// Получить базовые жанры (исключая TV-специфичные)
const baseIds = getBaseGenreIds(); // [12, 14, 16, 18, 27, 28, ...]
```

### 2. Интеграция в WatchList: `src/lib/normalize-watchlist-genres.ts`

Функции для обработки жанров при добавлении/обновлении WatchList:

```typescript
import { normalizeWatchListGenres, prepareGenresForDB } from '@/lib/normalize-watchlist-genres';

// Вариант 1: Простая нормализация
const normalized = normalizeWatchListGenres(tmdbData.genres);

// Вариант 2: Подготовка для БД
const genresForDB = prepareGenresForDB(tmdbData.genres);
await prisma.watchList.create({
  data: {
    // ... полей
    genres: genresForDB, // Нормализованные жанры
  },
});
```

### 3. Миграция существующих данных: `scripts/normalize-watchlist-genres.ts`

Нормализует жанры в уже добавленных фильмах:

```bash
# Запустить миграцию
npx ts-node scripts/normalize-watchlist-genres.ts

# Вывод:
# 📊 Найдено записей для обработки: 1026
# 📋 Статистика:
#    Всего записей: 1026
#    Нужна нормализация: 247
#    Уже нормализовано: 779
# 
# 💾 Начинаем обновление БД...
# ✓ Обновлено: 50/247
# ✓ Обновлено: 100/247
# ...
# ✅ Нормализация завершена!
#    Успешно нормализовано: 247
#    Ошибок: 0
```

## Интеграция в API WatchList

Для новых записей добавьте нормализацию в `src/app/api/watchlist/route.ts`:

```typescript
import { prepareGenresForDB } from '@/lib/normalize-watchlist-genres';

// При создании записи WatchList
const record = await prisma.watchList.upsert({
  where: { /* ... */ },
  update: {
    // ... существующие поля
    genres: prepareGenresForDB(tmdbData.genres), // ← Добавить эту строку
  },
  create: {
    // ... существующие поля
    genres: prepareGenresForDB(tmdbData.genres), // ← Добавить эту строку
  },
});
```

Аналогично для других мест добавления:
- `src/app/api/my-movies/route.ts`
- `src/app/api/recommendations/[id]/action/route.ts`
- `src/app/my-movies/actions.ts`

## Маппинг комбинированных жанров

| Комбинированный ID | Название | Komponenty |
|---|---|---|
| 10759 | Action & Adventure | Action (28) + Adventure (12) |
| 10765 | Sci-Fi & Fantasy | Science Fiction (878) + Fantasy (14) |
| 10768 | War & Politics | War (10752) + Western (37) |

## Примеры использования

### Пример 1: Добавление фильма с нормализацией

```typescript
// Получаем данные из TMDB
const tmdbData = await fetchMediaDetails(550, 'movie');
// tmdbData.genres = [
//   { id: 18, name: "Drama" },
//   { id: 53, name: "Thriller" }
// ]

// Нормализуем у живьх
const normalized = prepareGenresForDB(tmdbData.genres);

// Сохраняем в WatchList
await prisma.watchList.create({
  data: {
    userId: 'user123',
    tmdbId: 550,
    mediaType: 'movie',
    genres: normalized, // [{ id: 18, name: "Drama" }, { id: 53, name: "Thriller" }]
    // ... остальные поля
  },
});
```

### Пример 2: Сериал с комбинированным жанром

```typescript
// TMDB возвращает
const tvData = {
  genres: [
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 8, name: "Mystery" }
  ]
};

// Нормализация разделит 10765
const normalized = prepareGenresForDB(tvData.genres);
// Результат:
// [
//   { id: 8, name: "Mystery" },
//   { id: 14, name: "Fantasy" },
//   { id: 878, name: "Science Fiction" }
// ]
```

## Порядок применения

1. ✅ **Уже сделано**: Добавлено поле `genres Json?` в WatchList
2. ✅ **Уже сделано**: Создан справочник жанров (`tmdb-genres.ts`)
3. ✅ **Уже сделано**: Создана функция нормализации (`normalize-watchlist-genres.ts`)
4. ⏳ **TODO**: Запустить миграцию существующих данных
5. ⏳ **TODO**: Интегрировать `prepareGenresForDB()` в API WatchList

## Запуск миграции

```bash
# Проверить статус перед миграцией
npx ts-node scripts/check-watchlist-genres.ts

# Запустить нормализацию
npx ts-node scripts/normalize-watchlist-genres.ts

# Проверить результат
npx ts-node scripts/check-watchlist-genres.ts
```

## Тестирование

После миграции проверьте:

```typescript
// Проверить что жанры нормализованы
const record = await prisma.watchList.findFirst({
  where: { genres: { not: null } },
});

console.log(record.genres);
// Должно содержать только базовые жанры, без комбинированных ID
// [
//   { id: 28, name: "Action" },
//   { id: 12, name: "Adventure" }
// ]
```

## Примечания

- Нормализация работает **при добавлении новых** записей через `prepareGenresForDB()`
- **Существующие данные** обновляются через скрипт `normalize-watchlist-genres.ts`
- При неизвестных жанрах они игнорируются (сохраняются только известные 19 базовых)
- Дедупликация происходит автоматически (если жанр появляется дважды, сохраняется один раз)
