# External Integrations

## Database

### PostgreSQL (Neon)
- **Provider**: Neon serverless PostgreSQL
- **Adapter**: `@prisma/adapter-neon`
- **Client**: Prisma ORM 7.2.0
- **Configuration**: `DATABASE_URL` in environment
- **Features**:
  - Serverless connection pooling
  - Automatic scaling
  - Connection string managed in environment

### Connection Pattern
```typescript
// src/lib/prisma.ts
const sql = neon(connectionString);
const adapter = new PrismaNeon(sql);
const prisma = new PrismaClient({ adapter });
```

## Caching & Rate Limiting

### Upstash Redis
- **Provider**: Upstash (serverless Redis)
- **Used for**:
  - Rate limiting per endpoint
  - General caching (with TTL)
  - Cache invalidation patterns

### Rate Limit Configuration
- `/api/search`: 150 requests/minute
- `/api/recommendations`: 30 requests/minute
- `/api/user`: 60 requests/minute
- `/api/watchlist`: 200 requests/minute
- `/api/movie-details`: 300 requests/minute
- `/api/stats`: 100 requests/minute

## External APIs

### TMDB (The Movie Database)
- **API Version**: v3
- **Base URL**: `https://api.themoviedb.org/3`
- **Endpoints Used**:
  - `/trending/movie/{time_window}` - Trending movies
  - `/movie/popular` - Popular movies
  - `/search/multi` - Search movies and TV shows
  - `/{media_type}/{id}` - Media details
- **Language**: Russian (ru-RU)
- **Caching**: ISR with 1-hour revalidation
- **Mock Data**: Fallback to mock in development when network issues detected

### Fanart.tv (Optional)
- **Purpose**: Backup poster source
- **Endpoint**: `https://webservice.fanart.tv/v3/`
- **Optional**: Works without API key (graceful degradation)
- **Use Case**: When TMDB poster unavailable

## Authentication

### NextAuth.js
- **Strategy**: JWT (30-day max age)
- **Provider**: Credentials (email/password)
- **Session Storage**: Database-backed (Prisma)
- **Password Hashing**: bcryptjs
- **Configuration**: `src/auth.ts`

## Email

### Nodemailer
- **Provider**: Configurable SMTP
- **Use Cases**:
  - Invitation emails
  - Password reset (future)
  - Notifications (future)

## Development Tools

### MSW (Mock Service Worker)
- **Version**: ^2.0.0
- **Purpose**: API mocking in tests

### Vercel
- **Deployment**: Vercel platform
- **Features**:
  - Edge functions
  - Image optimization
  - Analytics
