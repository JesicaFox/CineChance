# Architecture

## Overall Pattern

### Next.js App Router
- **Framework**: Next.js 16 with App Router
- **Rendering**: Hybrid - Server Components by default, Client Components marked with `'use client'`
- **Data Fetching**: Server Components for data, Server Actions for mutations
- **Caching**: Next.js ISR (Incremental Static Regeneration)

### Architecture Layers

```
┌─────────────────────────────────────┐
│        Pages (src/app/)             │
│   Route handlers, Server Components │
├─────────────────────────────────────┤
│        Components (src/app/)        │
│   UI components, Client logic       │
├─────────────────────────────────────┤
│        Hooks (src/hooks/)           │
│   Custom React hooks                 │
├─────────────────────────────────────┤
│        Actions (src/app/)           │
│   Server Actions for mutations       │
├─────────────────────────────────────┤
│        API Routes (src/app/api/)    │
│   REST endpoints                     │
├─────────────────────────────────────┤
│        Library (src/lib/)           │
│   Utilities, singletons, services   │
├─────────────────────────────────────┤
│        Database (Prisma)            │
│   PostgreSQL via Neon                │
└─────────────────────────────────────┘
```

## Data Flow

### Read Path (Server Components)
1. Page component (Server) receives request
2. Calls library functions (`src/lib/*.ts`)
3. Library queries Prisma or external APIs (TMDB)
4. Data returned to component
5. Rendered on server, streamed to client

### Write Path (Server Actions)
1. Client component triggers action
2. Server Action executes in `src/app/*/actions.ts`
3. Action validates, calls Prisma
4. Returns result to client
5. Client uses React Query to invalidate and refetch

### API Path (REST)
1. Client makes fetch to `/api/*`
2. API route handler processes request
3. Rate limiting middleware checks limits
4. Handler executes business logic
5. Returns JSON response

## Key Abstractions

### Prisma Singleton
```typescript
// src/lib/prisma.ts
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
```
- Single instance across requests
- Connection pooling via Neon

### TMDB Service
```typescript
// src/lib/tmdb.ts
- fetchTrendingMovies()
- fetchPopularMovies()
- searchMedia()
- fetchMediaDetails()
- getFanartTvPoster()
```
- ISR caching (1 hour)
- Fallback to mock data on network issues

### Rate Limiting
```typescript
// src/middleware/rateLimit.ts
- rateLimit(req, endpoint, userId?)
- Per-endpoint configuration
- Redis-backed (Upstash)

### Authentication
```typescript
// src/auth.ts
- getServerAuthSession()
- authOptions (NextAuth config)
- JWT strategy with 30-day max age
```

## Entry Points

### Pages
- `/` - Home page (trending/popular)
- `/search` - Search with filters
- `/recommendations` - Personalized recommendations
- `/my-movies` - User's movie list
- `/profile` - User profile and settings
- `/stats` - Statistics pages
- `/admin` - Admin panel

### API Routes
- `/api/auth/*` - Authentication
- `/api/watchlist` - Movie list CRUD
- `/api/recommendations/*` - Recommendation system
- `/api/user/*` - User data
- `/api/stats/*` - Statistics
- `/api/movie/*` - Movie details

### Server Actions
- `src/app/my-movies/actions.ts` - Movie list mutations
- `src/app/actions/tagsActions.ts` - Tag management
- `src/app/actions/watchListActions.ts` - Watchlist operations
- `src/app/actions/deleteAccount.ts` - Account deletion
- `src/app/actions/logout.ts` - Logout handling
