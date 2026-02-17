---
phase: 01-tests-logging
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/__tests__/
  - src/lib/calculateWeightedRating.ts
  - src/lib/calculateCineChanceScore.ts
  - src/app/api/auth/signup/route.ts
  - src/app/api/watchlist/route.ts
  - src/app/api/recommendations/route.ts
autonomous: true
requirements:
  - TEST-02
  - TEST-01
  - LOG-01

must_haves:
  truths:
    - Тесты для weighted rating проходят
    - Тесты для calculateCineChanceScore проходят
    - API routes логируют с контекстом (request ID, endpoint, user ID, timestamp)
  artifacts:
    - path: src/lib/__tests__/calculateWeightedRating.test.ts
      provides: Unit тесты для weighted rating
    - path: src/lib/__tests__/calculateCineChanceScore.test.ts
      provides: Unit тесты для CineChance score
    - path: src/app/api/auth/signup/route.ts
      provides: Логирование с контекстом
  key_links:
    - from: src/lib/__tests__/
      to: src/lib/calculateWeightedRating.ts
      via: vitest
      pattern: import.*calculateWeightedRating
---

<objective>
Unit тесты для утилит + логирование в API routes
</objective>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-tests-logging/01-CONTEXT.md
</context>

<tasks>

<task type="auto">
  <name>Создать unit тесты для calculateWeightedRating</name>
  <files>src/lib/__tests__/calculateWeightedRating.test.ts</files>
  <action>
    Создать тесты для функции calculateWeightedRating из src/lib/calculateWeightedRating.ts:
    - Тест: базовый расчет (несколько оценок, разные значения)
    - Тест: одна оценка - возвращает исходную
    - Тест: weighted rating ближе к TMDB рейтингу при большом количестве оценок
    - Тест: weighted rating ближе к пользовательской оценке при малом количестве
    Использовать vitest, следовать существующему паттерну из fetchWithRetry.test.ts
  </action>
  <verify>npm run test:ci проходит</verify>
  <done>Тесты проходят, покрывают основные сценарии</done>
</task>

<task type="auto">
  <name>Создать unit тесты для calculateCineChanceScore</name>
  <files>src/lib/__tests__/calculateCineChanceScore.test.ts</files>
  <action>
    Создать тесты для функции calculateCineChanceScore из src/lib/calculateCineChanceScore.ts:
    - Тест: базовый расчет score
    - Тест: разные веса жанров
    - Тест: граничные случаи (пустой вход)
  </action>
  <verify>npm run test:ci проходит</verify>
  <done>Тесты проходят, покрывают основные сценарии</done>
</task>

<task type="auto">
  <name>Добавить логирование с контекстом в auth API</name>
  <files>
    - src/app/api/auth/signup/route.ts
    - src/app/api/auth/[...nextauth]/route.ts
  </files>
  <action>
    Добавить единое логирование в auth endpoints:
    - Использовать существующий logger из src/lib/logger.ts
    - Добавить request ID (генерировать или получать из заголовка)
    - Логировать: endpoint, user ID (если есть), timestamp, success/error
    - Формат: "[REQUEST_ID] endpoint - user: USER_ID - status - message"
  </action>
  <verify>При вызове API логи содержат полный контекст</verify>
  <done>Auth API логирует с контекстом</done>
</task>

<task type="auto">
  <name>Добавить логирование с контекстом в watchlist API</name>
  <files>
    - src/app/api/watchlist/route.ts
  </files>
  <action>
    Добавить единое логирование в watchlist endpoints:
    - Использовать существующий logger
    - Логировать: endpoint, user ID, tmdbId, action, success/error
  </action>
  <verify>При вызове API логи содержат полный контекст</verify>
  <done>Watchlist API логирует с контекстом</done>
</task>

<task type="auto">
  <name>Добавить логирование с контекстом в recommendations API</name>
  <files>
    - src/app/api/recommendations/route.ts
    - src/app/api/recommendations/random/route.ts
  </files>
  <action>
    Добавить единое логирование в recommendations endpoints:
    - Использовать существующий logger
    - Логировать: endpoint, user ID, algorithm, result count
  </action>
  <verify>При вызове API логи содержат полный контекст</verify>
  <done>Recommendations API логирует с контекстом</done>
</task>

</tasks>

<verification>
- npm run test:ci проходит
- npm run lint проходит
- Логи содержат request ID, endpoint, user ID, timestamp
</verification>

<success_criteria>
- Unit тесты для weighted rating и CineChance score созданы и проходят
- Auth, watchlist, recommendations API логируют с полным контекстом
</success_criteria>

<output>
After completion, create .planning/phases/01-tests-logging/01-SUMMARY.md
</output>
