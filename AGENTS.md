# AGENTS.md - Developer Guide for CineChance

This file provides guidelines and instructions for AI agents working on the CineChance project.

## Project Overview

**CineChance** is a movie tracker built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS. It features personalized recommendations, TMDB integration, and a rating system.

- **Database**: PostgreSQL (Neon) + Prisma 7.2
- **Auth**: NextAuth 4.24 with JWT strategy
- **External APIs**: TMDB, Upstash Redis (rate limiting)

---

## Build, Lint, and Test Commands

### Development
```bash
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server
```

### Testing
```bash
npm run test:ci         # Run all tests (Vitest, CI mode)
npx vitest run          # Run all tests
npx vitest run <file>   # Run a single test file
npx vitest               # Run tests in watch mode
```

### Linting
```bash
npm run lint            # ESLint check
npm run lint:strict     # ESLint with max warnings 0
```

### Database
```bash
npm run seed            # Seed database (ts-node prisma/seed.ts)
npx prisma generate     # Generate Prisma client (runs in postinstall)
npx prisma migrate dev --name <name>  # Create local migration
npx prisma db push      # Push schema without migration (dev only!)
```

---

## Code Style Guidelines

### General Principles
- **Server Components by default**: Use Server Components for data fetching; mark client components with `'use client'` at the top
- **No `any` types**: ESLint rules enforce `no-explicit-any` as error
- **No console.log**: Use the `logger` from `@/lib/logger` instead
- **Path aliases**: Always use `@/` for imports (e.g., `import { prisma } from '@/lib/prisma'`)

### TypeScript Conventions
```typescript
// Use explicit types for function parameters
async function fetchData(userId: string): Promise<DataType> { }

// Avoid any - use unknown or specific types
// BAD: const data: any = ...
// GOOD: const data: unknown = ... or specific interface

// Use proper error typing in catch blocks
} catch (error) {
  logger.error('Message', { 
    error: error instanceof Error ? error.message : String(error),
    context: 'ComponentName'
  });
}
```

### Import Order (recommended)
1. External libraries (React, Next.js)
2. Internal imports (`@/lib/`, `@/hooks/`)
3. Relative imports (`./`, `../`)
4. Type imports (`import type`)

```typescript
import { useState, useEffect } from 'react';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { SomeType } from '@/lib/types';
```

### Naming Conventions
- **Files**: kebab-case for utilities (`calculateWeightedRating.ts`), PascalCase for components (`MovieCard.tsx`)
- **Functions**: camelCase (`calculateWeightedRating`)
- **Types/Interfaces**: PascalCase (`interface MovieData`)
- **Constants**: UPPER_SNAKE_CASE for config constants, camelCase for mapping objects
- **React Components**: PascalCase (`export default function MovieCard()`)

### Component Structure
```typescript
// Client Component
'use client';

import { useState } from 'react';

interface Props {
  movie: Movie;
  onSelect: (id: number) => void;
}

export default function MovieCard({ movie, onSelect }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Server Components with Suspense
```typescript
import { Suspense } from 'react';
import LoaderSkeleton from '@/app/components/LoaderSkeleton';

async function DataLoader({ userId }: { userId: string }) {
  const data = await fetchData(userId);
  return <Display data={data} />;
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <div>Unauthorized</div>;

  return (
    <Suspense fallback={<LoaderSkeleton variant="full" text="Loading..." />}>
      <DataLoader userId={session.user.id} />
    </Suspense>
  );
}
```

---

## Error Handling

### API Routes
```typescript
export async function GET(req: Request) {
  const { success } = await rateLimit(req, '/api/endpoint');
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Logic here
    
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Endpoint GET error', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'EndpointName'
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### Prisma Errors
- Always use the singleton: `import { prisma } from '@/lib/prisma'`
- Never create new `PrismaClient()` instances
- Handle not-found cases explicitly with `null` checks

---

## Key Libraries and Patterns

### Authentication
- Use `getServerSession(authOptions)` in Server Components and Route Handlers
- Import `authOptions` from `@/auth`
- User ID: `session.user.id`

### Rate Limiting
```typescript
import { rateLimit } from '@/middleware/rateLimit';

const { success } = await rateLimit(request, '/api/path');
if (!success) {
  return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
}
```

### Prisma Queries
```typescript
// Find unique with composite key
const record = await prisma.watchList.findUnique({
  where: {
    userId_tmdbId_mediaType: { userId, tmdbId, mediaType },
  },
});

// Upsert pattern
await prisma.watchList.upsert({
  where: { /* composite key */ },
  update: { /* fields to update */ },
  create: { /* fields for new record */ },
});
```

### TMDB Integration
- All TMDB calls are in `src/lib/tmdb.ts`
- Uses ISR caching (1 hour for trending/popular)
- Handle missing `TMDB_API_KEY` gracefully

---

## File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/              # API Route Handlers
│   ├── components/       # Shared UI components
│   └── [feature]/        # Feature-specific pages
├── lib/                   # Utility functions and singletons
├── hooks/                 # Custom React hooks
├── middleware/            # Next.js middleware (rate limiting)
└── auth.ts               # NextAuth configuration
```

---

## Important Configuration

### Environment Variables Required
```bash
DATABASE_URL=postgresql://...   # Neon PostgreSQL
NEXTAUTH_SECRET=<32-char>        # JWT signing key
NEXTAUTH_URL=http://localhost:3000
TMDB_API_KEY=...                 # TMDB v3 API
UPSTASH_REDIS_REST_URL=...       # Rate limiting
UPSTASH_REDIS_REST_TOKEN=...
NODE_ENV=development|production
```

### Database Models (Prisma Schema)
Key models in `prisma/schema.prisma`:
- `User` - User accounts with password hash
- `WatchList` - Movie/show entries with composite key `userId_tmdbId_mediaType`
- `RatingHistory` - Rating change history
- `RecommendationLog` - Recommendation interaction tracking
- `MovieStatus` - Status definitions (want, watched, dropped, rewatched)

---

## Additional Resources

- See `.github/copilot-instructions.md` for detailed architecture and workflow guidance
- Check `docs/` folder for project-specific documentation
- Use `context7` tool to verify external library documentation when needed
