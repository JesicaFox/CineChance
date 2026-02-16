# Tech Stack

## Languages & Runtime

- **TypeScript** - Primary language (strict mode enabled)
- **JavaScript** - Some legacy files, test files
- **Node.js** - Next.js 16 runtime

## Frameworks

- **Next.js 16** - App Router, React 19, Server Components
- **React 19** - UI library with Server Components
- **Tailwind CSS 4** - Styling with custom configuration

## Key Dependencies

### Core
- `next` ^16.0.10 - React framework
- `react` ^19.2.3 - UI library
- `react-dom` ^19.2.3 - React DOM renderer

### Database & ORM
- `@prisma/client` ^7.2.0 - ORM
- `@prisma/adapter-neon` 7.2.0 - Neon adapter
- `@neondatabase/serverless` ^1.0.2 - Serverless PostgreSQL
- `pg` ^8.16.3 - PostgreSQL driver

### Authentication
- `next-auth` ^4.24.13 - Authentication (JWT strategy)
- `@auth/prisma-adapter` ^2.11.1 - Prisma adapter for NextAuth
- `bcryptjs` ^2.4.3 - Password hashing

### Caching & Rate Limiting
- `@upstash/redis` ^1.36.1 - Redis client (Upstash)
- `@upstash/ratelimit` ^2.0.8 - Rate limiting

### Data Fetching
- `@tanstack/react-query` ^5.90.17 - Client-side caching
- Custom fetch utilities with retry logic

### UI Components
- `lucide-react` ^0.562.0 - Icons
- `tailwind-scrollbar` ^4.0.2 - Custom scrollbar

### Email
- `nodemailer` ^7.0.12 - Email sending

### Utilities
- `date-fns` ^4.1.0 - Date utilities
- `clsx` / `class-variance-authority` - CSS class utilities

### Dev Dependencies

- `typescript` ^5.9.3
- `eslint` ^9 - Linting
- `eslint-config-next` ^16.0.10
- `vitest` ^1.6.1 - Testing framework
- `prisma` 7.2.0 - Database tooling
- `ts-node` ^1.7.1 - TypeScript execution
- `msw` ^2.0.0 - Mock Service Worker
- `tailwindcss` ^4.1.18
- `@tailwindcss/postcss` ^4.1.18
- `@tailwindcss/typography` ^0.5.19
- `postcss` ^8.5.6
- `autoprefixer` ^10.4.23

## Configuration

### TypeScript (`tsconfig.json`)
- Strict mode enabled
- Path aliases: `@/*` -> `./src/*`
- JSX: react-jsx

### ESLint (`eslint.config.mjs`)
- `@typescript-eslint/no-explicit-any`: error
- `no-unused-vars`: error
- `no-console`: error (allowed in logger.ts)

### Tailwind (`tailwind.config.ts`)
- Custom breakpoints including xs (475px)
- Custom scrollbar plugin

### Prisma
- Provider: postgresql
- Uses Neon serverless adapter
- 30+ migrations

## Environment Variables Required

```
DATABASE_URL=postgresql://...   # Neon PostgreSQL
NEXTAUTH_SECRET=<32-char>        # JWT signing key
NEXTAUTH_URL=http://localhost:3000
TMDB_API_KEY=...                 # TMDB v3 API
FANART_API_KEY=...              # Fanart.tv (optional)
UPSTASH_REDIS_REST_URL=...      # Rate limiting
UPSTASH_REDIS_REST_TOKEN=...
NODE_ENV=development|production
```

## Package Manager

- **npm** - Package manager (npm install, npm run)
