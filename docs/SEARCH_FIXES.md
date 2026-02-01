# Исправление проблем поиска на проде

## Проблемы

1. **Rate Limiting**: Слишком низкий лимит (60 запросов/минуту) для поиска
2. **N+1 Query**: Использование `include: { status: { select: { name: true } } }` создавало гигантский IN запрос
3. **Отсутствие обработки ошибок**: Нет graceful degradation при ошибках TMDB API
4. **Нет retry логики**: Клиент не пытался повторить запросы при 429 ошибках

## Исправления

### 1. Увеличение Rate Limit

**Было:**
```typescript
'/api/search': { points: 60, duration: 60 }, // 60 запросов в минуту
```

**Стало:**
```typescript
'/api/search': { points: 300, duration: 60 }, // 300 запросов в минуту (5 запросов/сек)
```

### 2. Оптимизация запроса к БД

**Было (проблема):**
```typescript
const watchlist = await prisma.watchList.findMany({
  where: { userId: listSession.user.id as string },
  select: {
    tmdbId: true,
    mediaType: true,
    status: { select: { name: true } }, // <- Создавало IN запрос
  },
});
```

**Стало (оптимизация):**
```typescript
const watchlist = await prisma.watchList.findMany({
  where: { userId: listSession.user.id as string },
  select: {
    tmdbId: true,
    mediaType: true,
    statusId: true, // <- Просто ID статуса
  },
});
```

### 3. Использование statusId вместо названий

**Было:**
```typescript
case 'wantToWatch':
  return isInWatchlist && watchlistItem.status === 'Хочу посмотреть';
case 'watched':
  return isInWatchlist && watchlistItem.status === 'Просмотрено';
```

**Стало:**
```typescript
case 'wantToWatch':
  return isInWatchlist && watchlistItem.statusId === 1;
case 'watched':
  return isInWatchlist && watchlistItem.statusId === 2;
```

### 4. Улучшенная обработка ошибок TMDB API

**Добавлено:**
```typescript
const promise = fetch(url.toString(), { next: { revalidate: 3600 } })
  .then(async res => {
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.status_code) {
      throw new Error(`TMDB API error: ${data.status_message}`);
    }
    return data;
  })
  .catch(error => ({ error, page: apiPage }));
```

### 5. Graceful degradation при ошибках

**Добавлено:**
```typescript
// Если все запросы завершились с ошибками, возвращаем пустой результат
if (hasErrors && allResults.length === 0) {
  logger.warn('All TMDB API requests failed', { query });
  return NextResponse.json({ 
    results: [], 
    totalPages: 1, 
    totalResults: 0,
    error: 'Search temporarily unavailable' 
  });
}
```

### 6. Retry логика на клиенте

**Добавлено:**
```typescript
retry: (failureCount, error) => {
  if (error instanceof Error) {
    if (error.message.includes('Rate limit exceeded')) {
      return failureCount < 3; // До 3 попыток для rate limit
    }
    if (error.message.includes('Network error')) {
      return failureCount < 2; // До 2 попыток для сетевых ошибок
    }
  }
  return false;
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
```

### 7. Улучшенная обработка ошибок в useSearch

**Добавлено:**
```typescript
if (!response.ok) {
  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please try again in a moment.');
  }
  if (response.status === 500) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Search service temporarily unavailable');
  }
  throw new Error(`Search failed: ${response.status} ${response.statusText}`);
}
```

## Результат

1. **Производительность**: Устранен N+1 запрос к MovieStatus
2. **Надежность**: Graceful degradation при ошибках TMDB API
3. **UX**: Автоматические retry для rate limit ошибок
4. **Масштабируемость**: Увеличен rate limit до 300 запросов/минуту
5. **Логирование**: Детальное логирование ошибок для мониторинга

## Места изменений

1. `src/middleware/rateLimit.ts` - Увеличение лимитов
2. `src/app/api/search/route.ts` - Оптимизация запросов и обработка ошибок
3. `src/hooks/useSearch.ts` - Retry логика и обработка ошибок

## Тестирование

После деплоя проверить:
1. Поиск работает без 429 ошибок
2. Результаты поиска отображаются корректно
3. При ошибках TMDB API показывается уведомление
4. Фильтры по статусам работают корректно
