# Phase 1: Tests & Logging - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Добавить тесты и единое логирование для критических частей системы. Не менять существующий функционал — только добавить тесты и логирование.

</domain>

<decisions>
## Implementation Decisions

### Test Scope
- Тесты для critical paths: auth, watchlist, recommendations
- Не тестировать всё подряд — только то, что критично для пользователя

### Test Approach
- Unit тесты: weighted rating calculation, score calculation, validation functions
- Интеграционные тесты: API endpoints (auth, watchlist, recommendations)
- Использовать существующий vitest + msw

### Logging Format
- Текстовый формат (не JSON)
- Легко читать в консоли
- Уже есть logger в src/lib/logger.ts — использовать его

### Logging Context
- Full context: request ID + endpoint + user ID + timestamp
- Request ID генерируется для каждого запроса
- User ID — если авторизован

</decisions>

<specifics>
## Specific Ideas

- "Хочу понимать что сломалось без лазания по коду"
- "Тесты должны ловить регрессии после изменений"

</specifics>

<deferred>
## Deferred Ideas

- E2E тесты — после стабилизации
- Performance тесты — отдельная фаза

</deferred>

---

*Phase: 01-tests-logging*
*Context gathered: 2026-02-17*
