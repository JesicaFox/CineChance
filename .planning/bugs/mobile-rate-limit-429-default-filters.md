# Bug: Rate limit 429 на мобильных устройствах приводит к показу дефолтных фильтров

Дата: 2026-03-10
Slug: mobile-rate-limit-429-default-filters

## Описание пользователя
При работе с сайтом через браузер смартфона (Chrome, Android) на странице /recommendations загружаются предустановленный набор фильтров по умолчанию, вместо персональных настроек. При этом в консоли выводятся 429 ошибки:
- GET /api/user/settings 429
- PUT /api/user/settings 429
- Rate limit: 60, Remaining: 0

В десктоп варианте все работает корректно.

## Шаги воспроизведения
1. Открыть страницу /recommendations на мобильном устройстве (Chrome, Android)
2. При первом же запросе происходит 429 ошибка
3. Вместо персональных настроек показываются дефолтные значения

## Ожидаемое vs Фактическое
- **Ожидалось**: Персональные фильтры загружаются с сервера
- **Происходит**: Загружаются дефолтные настройки (minRating: 6.0, includeWant: true, includeWatched: true, includeDropped: false, и т.д.)

## Root Cause
**Две независимые проблемы:**

### Проблема 1: Rate limiting использует IP вместо userId
**Файл**: `src/middleware/rateLimit.ts`, строка 74-75
```typescript
const ip = req.headers.get('x-forwarded-for') || 'anonymous';
const key = userId ? `user:${userId}` : `ip:${ip}`;
```
**Причина**: В `/api/user/settings` route (строка 12) userId НЕ передаётся в rateLimit:
```typescript
const { success } = await rateLimit(req, '/api/user'); // НЕТ 3-го параметра!
```
Поэтому rate limiting считается по IP. На мобильных устройствах (особенно с shared IP мобильных операторов или при параллельных запросах в PWA) лимит 60/мин быстро исчерпывается.

### Проблема 2: Фронтенд не обрабатывает 429 ошибку
**Файл**: `src/app/recommendations/RecommendationsClient.tsx`, строки 199-219
```typescript
const response = await fetch('/api/user/settings');
if (response.ok) {  // <--- Проверяет только OK, игнорирует 429!
  const data = await response.json();
  // ... обновляет state настройками
}
// При 429: response.ok = false, блок не выполняется
// State остаётся с дефолтными значениями из useState:
```
State инициализируется дефолтными значениями (строки 164-184):
```typescript
const [userMinRating, setUserMinRating] = useState<number>(6.0);
const [userListPreferences, setUserListPreferences] = useState({
  includeWant: true,
  includeWatched: true,
  includeDropped: false,
});
```

## Acceptance критерии исправления
- [ ] Rate limiting в `/api/user/settings` использует userId, а не IP
- [ ] Фронтенд корректно обрабатывает 429 ошибку (показывает уведомление пользователю или повторяет запрос)
- [ ] Регрессий в существующих тестах нет

## Тест для воспроизведения
Тест должен ПАДАТЬ пока баг не исправлен:

```typescript
// Проверяет что rateLimit вызывается с userId для защищённых эндпоинтов
describe('Bug: mobile rate limit 429', () => {
  it('should pass userId to rateLimit for /api/user/settings', async () => {
    // Мокаем getServerSession чтобы вернуть сессию с userId
    // Делаем запрос к /api/user/settings
    // Проверяем что rateLimit был вызван с userId
    // Сейчас: rateLimit вызывается БЕЗ userId - TEST FAILS
  });
  
  it('should handle 429 error gracefully in RecommendationsClient', async () => {
    // Мокаем fetch чтобы возвращал 429
    // Рендерим компонент
    // Проверяем что показывается ошибка/уведомление, а не дефолтные фильтры
    // Сейчас: дефолтные фильтры показываются - TEST FAILS
  });
});
```
