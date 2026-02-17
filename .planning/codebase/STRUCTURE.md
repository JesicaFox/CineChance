# Directory Structure

## Overview

```
CineChance-2/
├── .planning/              # GSD planning (generated)
├── .github/               # GitHub workflows, copilot instructions
├── .devcontainer/         # Dev container config
├── docs/                  # Project documentation
├── public/                # Static assets
├── src/                   # Source code
│   ├── app/              # Next.js App Router
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and singletons
│   ├── middleware/       # Next.js middleware
│   └── @types/           # Type declarations
├── prisma/               # Database schema and migrations
├── .env                  # Environment template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vitest.config.ts      # Test config
├── tailwind.config.ts    # Tailwind config
└── eslint.config.mjs      # ESLint config
```

## Key Source Directories

### `src/app/` - Next.js App Router
```
src/app/
├── page.tsx              # Home page
├── layout.tsx            # Root layout
├── providers.tsx         # Context providers
├── globals.css           # Global styles
├── api/                  # API routes (60+ endpoints)
│   ├── auth/            # Authentication endpoints
│   ├── recommendations/ # Recommendation system
│   ├── user/            # User data endpoints
│   ├── watchlist/       # Watchlist CRUD
│   ├── stats/           # Statistics
│   ├── movie/           # Movie details
│   └── ...
├── components/           # Shared UI components
│   ├── MovieCard.tsx
│   ├── MovieGrid.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── RatingModal.tsx
│   ├── AuthModal.tsx
│   └── ...
├── search/              # Search page
├── recommendations/     # Recommendations page
├── my-movies/           # User's movie list
├── profile/             # User profile pages
│   ├── components/     # Profile-specific components
│   ├── stats/          # User statistics
│   ├── settings/       # Settings page
│   └── invite/         # Invitation system
├── stats/               # Statistics pages
│   ├── tags/[tagId]/   # Tag detail
│   ├── genres/[genre]/ # Genre detail
│   └── ratings/[rating]/ # Rating detail
├── collection/[id]/     # Collection detail
├── person/[id]/         # Person/actor detail
├── admin/               # Admin panel
│   ├── users/
│   ├── invitations/
│   └── monitoring/
└── invite/[code]/       # Invitation landing
```

### `src/lib/` - Utilities and Services
```
src/lib/
├── prisma.ts            # Prisma singleton
├── auth.ts              # NextAuth config
├── tmdb.ts              # TMDB API client
├── tmdbCache.ts         # TMDB caching
├── redis.ts             # Redis client & caching
├── logger.ts            # Logging utility
├── queryClient.ts       # React Query client
├── movieStatus.ts       # Movie status constants
├── calculateWeightedRating.ts
├── calculateCineChanceScore.ts
├── fetchWithRetry.ts    # Fetch with retry logic
├── cache.ts             # General caching
├── ageFilter.ts         # Age filtering
├── email.ts             # Email service
├── db-utils.ts          # Database utilities
└── __tests__/          # Unit tests
    └── fetchWithRetry.test.ts
```

### `src/hooks/` - Custom React Hooks
```
src/hooks/
├── index.ts             # Exports
├── useSearch.ts         # Search functionality
├── useBatchData.ts      # Batch data loading
└── useLazyData.ts      # Lazy loading
```

### `src/middleware/` - Next.js Middleware
```
src/middleware/
└── rateLimit.ts         # Rate limiting
```

### `prisma/` - Database
```
prisma/
├── schema.prisma        # Database schema (600+ lines)
├── seed.ts              # Database seeder
├── prismaClient.ts      # Prisma client config
└── migrations/          # Database migrations (30+)
```

## Key Files

### Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS config
- `eslint.config.mjs` - ESLint rules
- `vitest.config.ts` - Test configuration

### Documentation
- `AGENTS.md` - AI agent guidelines
- `docs/README.md` - Documentation index
- `docs/bugs/` - Bug reports and fixes
- `docs/reports/` - Implementation reports
- `docs/ml/` - ML system documentation

## File Naming Conventions

- **Pages**: `page.tsx`, `[id]/page.tsx`
- **Components**: PascalCase (`MovieCard.tsx`, `RatingModal.tsx`)
- **Utilities**: kebab-case (`calculateWeightedRating.ts`, `fetchWithRetry.ts`)
- **Server Actions**: `actions.ts` (in feature folders)
- **API Routes**: `route.ts` (in api folders)
- **Types**: `.d.ts` files in `@types/`

## Import Conventions

Path aliases (from `tsconfig.json`):
- `@/*` maps to `./src/*`
- Example: `import { prisma } from '@/lib/prisma'`

Import order:
1. External libraries (React, Next.js)
2. Internal imports (`@/lib/`, `@/hooks/`)
3. Relative imports (`./`, `../`)
4. Type imports (`import type`)
