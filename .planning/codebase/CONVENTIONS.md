# Code Conventions

## TypeScript

### Strict Mode
- TypeScript strict mode enabled in `tsconfig.json`
- No `any` types allowed (ESLint rule: `@typescript-eslint/no-explicit-any: error`)

### Type Annotations
```typescript
// Required: explicit types for function parameters
async function fetchData(userId: string): Promise<DataType> { }

// Required: proper error typing in catch blocks
} catch (error) {
  logger.error('Message', { 
    error: error instanceof Error ? error.message : String(error),
    context: 'ComponentName'
  });
}
```

### Import Patterns
```typescript
// Use path aliases
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Type imports
import type { SomeType } from '@/lib/types';
```

## Naming Conventions

### Files
- **Components**: PascalCase (`MovieCard.tsx`, `RatingModal.tsx`)
- **Utilities**: kebab-case (`calculateWeightedRating.ts`, `fetchWithRetry.ts`)
- **Types**: PascalCase with `.d.ts` extension

### Functions & Variables
- **Functions**: camelCase (`calculateWeightedRating`)
- **Constants**: UPPER_SNAKE_CASE for config, camelCase for mapping objects

### Types & Interfaces
- **Types/Interfaces**: PascalCase (`interface MovieData`)

### React Components
- **Export**: PascalCase (`export default function MovieCard()`)
- **Props**: Interface with descriptive name (`interface Props`)

## Code Style

### General Rules
- **No console.log**: Use `logger` from `@/lib/logger`
- **No unused vars**: ESLint enforces `no-unused-vars: error`
- **Comments**: Avoid unless absolutely necessary

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

### Server Components
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

## Import Order (Recommended)
1. External libraries (React, Next.js)
2. Internal imports (`@/lib/`, `@/hooks/`)
3. Relative imports (`./`, `../`)
4. Type imports (`import type`)

## ESLint Rules

From `eslint.config.mjs`:
- `@typescript-eslint/no-explicit-any: 'error'` - No `any` types
- `no-unused-vars: ['error', { 'argsIgnorePattern': '^_' }]` - No unused vars
- `no-console: 'error'` - No console.log (except in logger.ts)

## Prisma Patterns

- Always use singleton: `import { prisma } from '@/lib/prisma'`
- Never create new `PrismaClient()` instances
- Handle not-found cases with explicit `null` checks
- Use composite keys for unique constraints

## TMDB Integration

- All TMDB calls in `src/lib/tmdb.ts`
- Uses ISR caching (1 hour for trending/popular)
- Handle missing `TMDB_API_KEY` gracefully
- Fallback to mock data on network errors
