# Concerns

## Technical Debt

### Testing Gaps
- **Limited unit test coverage**: Only 1 test file exists (`fetchWithRetry.test.ts`)
- **No E2E tests**: Manual testing predominates
- **No integration tests**: API routes tested manually
- **Recommendation**: Add more unit tests for utilities, consider Playwright for E2E

### Code Complexity
- **Large Prisma schema**: 600+ lines with 15+ models, complex relationships
- **Recommendation system complexity**: Multiple recommendation algorithms (v1, v2, v3), many related tables
- **Feature flags**: Multiple algorithm versions tracked in database

### Documentation Drift
- **Reports may be outdated**: `docs/reports/` contains historical information
- **Recommendation**: Review and update or remove outdated docs

## Known Issues (from docs/bugs/)

### Recent Bugs Fixed
- **2026-02-16**: Anime/Cartoon filters not working correctly
- **2026-02-15**: Genre stats incorrect status display
- **2026-02-15**: Stats rate limiting issues
- **2026-02-15**: Stats mismatch between pages
- **2026-02-15**: Person API errors
- **2026-02-15**: Server actions errors
- **2026-02-14**: Pagination missing on stats pages
- **2026-02-13**: Pagination duplicate movies
- **2026-02-13**: Actor photo slow loading
- **2026-02-13**: Profile average rating fix
- **2026-02-13**: CineChance rating not fetched
- **2026-02-13**: My movies incorrect status display

### Recurring Issues
- **Rate limiting**: Multiple endpoints hit rate limits
- **Network issues**: Development environment proxy issues causing fallback to mock data
- **Image loading**: Poster loading performance issues

## Performance Concerns

### Database
- **Complex queries**: Many JOINs across multiple tables (recommendations, watchlist, tags)
- **N+1 potential**: Some queries may not use proper eager loading
- **Large datasets**: Users with extensive watchlists

### API
- **60+ API routes**: Many endpoints with varying complexity
- **Rate limiting**: Conservative limits may affect UX
- **Caching**: ISR used but could be optimized

### Frontend
- **Client-side data loading**: React Query used but batch loading can be slow
- **Image heavy**: Many movie posters loaded
- **Bundle size**: Large, could benefit from code splitting

## Security Considerations

### Current Implementation
- **Password hashing**: bcryptjs used correctly
- **Session management**: JWT with 30-day max age
- **Rate limiting**: Per-endpoint protection
- **Environment variables**: Secrets not committed

### Potential Concerns
- **No CSRF protection**: Rely on same-origin policy
- **Input validation**: Limited server-side validation
- **Error messages**: May leak information in production

## Fragile Areas

### Recommendation System
- **Complex algorithm logic**: Multiple versions, hard to maintain
- **ML infrastructure**: User embeddings, prediction logs add complexity
- **A/B testing**: Multiple experiment models

### Data Migrations
- **30+ migrations**: Some may be unnecessary or redundant
- **Schema evolution**: Complex relationships between models

### External Dependencies
- **TMDB API**: Rate limited, can fail
- **Upstash Redis**: External service dependency
- **Neon Database**: Serverless may have cold starts

## Areas Needing Attention

### High Priority
1. **Add test coverage** - Critical functions untested
2. **Rate limit tuning** - Current limits too restrictive for some use cases
3. **Error handling improvements** - Better error messages and logging

### Medium Priority
4. **Bundle size optimization** - Code splitting, lazy loading
5. **API response caching** - More aggressive caching
6. **Documentation cleanup** - Remove outdated reports

### Low Priority
7. **Add E2E tests** - Playwright or similar
8. **Performance monitoring** - APM tooling
9. **Analytics** - Better user behavior tracking
