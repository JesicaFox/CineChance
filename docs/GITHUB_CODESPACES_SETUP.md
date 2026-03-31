# Настройка DATABASE_URL в GitHub Codespaces

## Проверка текущего статуса

Сначала запустите скрипт проверки:

```bash
npx ts-node scripts/check-env.ts
```

Он покажет, какие переменные окружения доступны и где их искать.

## Способы установки DATABASE_URL в Codespaces

### Способ 1: Создать .env.local в контейнере

Самый простой способ - создать файл `.env.local` в корне проекта:

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://your-user:your-password@your-host:5432/your-database
TMDB_API_KEY=your-tmdb-key
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
EOF
```

Затем проверьте:
```bash
npx ts-node scripts/check-env.ts
```

### Способ 2: Установить через переменные Codespaces

В GitHub Codespaces можно сохранить секреты, которые будут доступны автоматически:

1. Откройте GitHub Codespaces settings
2. Перейдите на вкладку "Secrets"
3. Добавьте секрет `DATABASE_URL=postgresql://...`
4. Затем в `.devcontainer/devcontainer.json` добавьте:

```json
"remoteEnv": {
  "DATABASE_URL": "${containerEnv:DATABASE_URL}"
}
```

### Способ 3: Экспортировать перед запуском

Если у вас есть значение DATABASE_URL, просто экспортируйте его:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/db"
npx ts-node scripts/migrate-anime-cartoon-mediaType.ts
```

## Получение DATABASE_URL

Значение DATABASE_URL зависит от вашей БД:

### Для Vercel Postgres
Перейдите в Vercel dashboard → Storage → Postgres → Connection String (Pooling)

### Для Neon
Перейдите в https://console.neon.tech/ → Project → Connection string

### Для локального PostgreSQL
```
postgresql://postgres:password@localhost:5432/cinechance
```

## Проверка подключения

После установки DATABASE_URL проверьте:

```bash
# 1. Проверьте переменные
npx ts-node scripts/check-env.ts

# 2. Попробуйте запустить приложение
npm run dev

# 3. Если приложение работает, скрипт миграции тоже будет работать:
npx ts-node scripts/migrate-anime-cartoon-mediaType.ts
```

## Почему .env.local не работает в Codespaces?

В некоторых случаях файл `.env.local` может быть недоступен при запуске скриптов в Codespaces. Это происходит потому, что:

1. **.env.local не закоммичен в git** (он в .gitignore)
2. **GitHub Codespaces копирует только файлы из git**
3. **Нужно либо создать .env.local в контейнере, либо использовать переменные окружения Codespaces**

Решение: создайте `.env.local` прямо в контейнере с помощью команды выше.
