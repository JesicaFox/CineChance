```md
# Copilot / AI-инструкции для проекта CineChance

Коротко и по делу — что важно знать, чтобы быстро вносить изменения в этот репозиторием.

- **Архитектура:** Next.js (app router) + React (TypeScript). Серверные и клиентские части находятся в `src/app/` — используются Server Components и Route Handlers. БД — Postgres с Prisma (Neon adapter).

- **Ключевые файлы и точки входа:**
  - `src/app/layout.tsx`, `src/app/page.tsx` — основной UI и провайдеры.
  - `src/app/api/` — Route Handlers (создавайте `route.ts` и экспортируйте `GET/POST`). Пример: `src/app/api/auth/[...nextauth]/route.ts`.
  - `src/lib/prisma.ts` — единый экспорт `prisma`; импортируйте его всегда отсюда.
  - `src/auth.ts` — конфигурация `authOptions` для NextAuth и helper `getServerAuthSession()`.
  - `src/lib/tmdb.ts` — TMDB helper (проверка `TMDB_API_KEY`, обработка ошибок).
  - `prisma/schema.prisma` и `prisma/migrations/` — схема и миграции.

- **Запуск и основные команды:**
  - `npm run dev` — запуск в dev режиме (Next).
  - `npm run build` — сборка.
  - `npm run start` — запуск продакшн.
  - `postinstall` выполняет `prisma generate` (см. `package.json`).

- **Обязательные переменные окружения:**
  - `DATABASE_URL` (Neon / Postgres)
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
  # Copilot / AI-инструкции для проекта CineChance

  Кратко и практично — что важно знать, чтобы быстро вносить изменения в этом репозитории.

  - **Big picture:** приложение — Next.js (App Router) + React + TypeScript. UI и маршруты находятся в `src/app/`. Серверный код реализован в Server Components и Route Handlers; клиентские компоненты помечаются `'use client'`. БД — Postgres + Prisma; внешняя интеграция — TMDB (через `src/lib/tmdb.ts`).

  - **Ключевые файлы / точки входа:**
    - `src/app/layout.tsx`, `src/app/page.tsx` — глобальные провайдеры и корневой рендеринг.
    - `src/app/api/` — Route Handlers: создавайте `route.ts` и экспортируйте `GET`, `POST` и т.п. Примеры: `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/search/route.ts`.
    - `src/lib/prisma.ts` — единственный экземпляр Prisma (импортируйте его везде; не создавайте новый `PrismaClient`).
    - `src/auth.ts` — конфигурация NextAuth и `getServerAuthSession()`.
    - `src/lib/tmdb.ts` — обёртки для TMDB API (проверка `TMDB_API_KEY`, централизованная обработка ошибок).
    - `prisma/schema.prisma`, `prisma/migrations/` и `prisma/seed.ts` — схема, миграции и сиды.

  - **Конвенции и паттерны (важно):**
    - По умолчанию Server Components в `src/app/`; если нужен клиентский код — добавьте `'use client'` на вершину файла.
    - API-эндпоинты делают простую проверку и возвращают `NextResponse`/`Response`. Смотрите шаблоны в `src/app/api/*/route.ts`.
    - Не создавайте новые экземпляры Prisma: всегда `import { prisma } from 'src/lib/prisma'`.
    - Аутентификация: NextAuth с CredentialsProvider. Пароли хранятся как `User.hashedPassword`, сравнение — `bcryptjs`. Серверную сессию получайте через `getServerAuthSession()`.
    - Повторное использование логики: общие утилиты в `src/lib/*`, UI-компоненты в `src/app/components/`.

  - **Добавление функциональности — практический пример:**
    1. Новый API: создайте папку `src/app/api/<name>/` и файл `route.ts`, экспортируйте нужные HTTP-методы.
    2. Используйте `prisma` из `src/lib/prisma.ts` и `getServerAuthSession()` при необходимости проверять пользователя.
    3. Для внешних данных — добавьте/вызовите функции в `src/lib/tmdb.ts`.

  - **Рабочие команды и CI/developers workflow:**
    - Dev сервер: `npm run dev` (Next). Логи видны в терминале.
    - Сборка: `npm run build`; запуск prod: `npm run start`.
    - После изменений в Prisma схеме: `npx prisma generate` и локальные миграции `npx prisma migrate dev`.
    - `postinstall` в `package.json` запускает `prisma generate` — учтите это на CI.

  - **Переменные окружения (обязательные):**
    - `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TMDB_API_KEY`.

  - **Интеграции и точки внимания:**
    - TMDB: все вызовы централизованы в `src/lib/tmdb.ts`. Код ожидает, что `TMDB_API_KEY` может отсутствовать — обработайте этот кейс.
    - Auth: `src/app/api/auth/[...nextauth]/*` и `src/auth.ts` вместе формируют поток логина/сидов/сессий.
    - Watchlist / movie status: логика работы со статусами фильмов находится в `src/lib/movieStatus.ts` и API-эндпоинте `src/app/api/watchlist/route.ts`.

  - **Практические рекомендации для ИИ-агента:**
    - Изменения в серверной логике лучше оформлять через Route Handlers в `src/app/api/`.
    - Для UI-изменений следуйте текущей структуре компонентов в `src/app/components/` и `src/app/*/page.tsx` (Server Component → небольшие клиентские части при необходимости).
    - Проверяйте `src/lib/*` на наличие общих функций перед созданием новых утилит.
    - При изменениях в модели данных обновите `prisma/schema.prisma`, выполните `npx prisma generate` и добавьте миграцию в `prisma/migrations/`.

  Если хотите, могу дополнить инструкцию примерами кода для создания Route Handler, использования `prisma` и вызова TMDB. Напишите, какие примеры предпочитаете.
