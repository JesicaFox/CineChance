---
status: resolved
trigger: "Ошибка не исправлена! По прежнему не работает функционал добавления фильмов в черный список на странице поиска и фильмографии актеров/режиссеров. На главной странице и странице Мои фильмы этот функционал работает корректно!"
created: "2026-02-19T14:20:00.000Z"
updated: "2026-02-19T15:15:00.000Z"
---

## Summary

**Root Causes Found:**
1. **Search page**: Duplicate blacklist fetch causing rate limit exceeded
2. **Rate limiting**: /api/blacklist was using /api/user limit (60/min) which was too restrictive
3. **My Movies page**: Missing BlacklistProvider wrapper

## Investigation Process

### Initial Problem
User reported blacklist toggle not working on Search and Person pages, but working on Home and My Movies.

### Step 1: Console Logs Analysis
Found rate limit errors:
```
Rate limit exceeded for ip:93.92.204.252 on /api/user. Limit: 60, Remaining: 0
GET /api/user/blacklist 429
```

### Step 2: Code Analysis
- SearchClient was making 2 requests to fetch blacklist:
  1. Local state via `/api/user/blacklist` (limit 60/min)
  2. BlacklistProvider via `/api/blacklist/all` (limit 200/min)
- This caused rate limit exceeded quickly

### Step 3: Fixes Applied

**Fix 1: Remove duplicate blacklist fetch on Search page**
- SearchClient now uses BlacklistContext instead of local state
- Single source of truth for blacklist data
- File: `src/app/search/SearchClient.tsx`

**Fix 2: Add dedicated rate limit for blacklist API**
- Added `/api/blacklist`: { points: 200, duration: 60 } to endpointLimits
- Updated all blacklist routes (GET, POST, DELETE) to use new limit
- Previously was using /api/user limit (60/min) which was too restrictive
- Files: `src/middleware/rateLimit.ts`, `src/app/api/blacklist/route.ts`, `src/app/api/blacklist/all/route.ts`

**Fix 3: Add BlacklistProvider to My Movies page**
- MyMoviesContentClient was missing BlacklistProvider
- Added wrapper around FilmGridWithFilters
- File: `src/app/my-movies/MyMoviesContentClient.tsx`

## Commits

- `8b62ab7` fix: remove duplicate blacklist fetch causing rate limit on search page
- `e62a574` fix: add dedicated rate limit for blacklist API (100/min instead of 60/min)
- `ce99d77` fix: add BlacklistProvider to My Movies page
- `f91b928` fix: increase blacklist rate limit to 200/min

## Files Changed

1. `src/app/search/SearchClient.tsx`
2. `src/middleware/rateLimit.ts`
3. `src/app/api/blacklist/route.ts`
4. `src/app/api/blacklist/all/route.ts`
5. `src/app/my-movies/MyMoviesContentClient.tsx`

## Verification

- [x] Home page - blacklist toggle works
- [x] Search page - blacklist toggle works
- [x] My Movies page - blacklist toggle works
- [x] Person filmography page - blacklist toggle works
- [x] Build passes without errors

## Related Issues

Pattern: Missing BlacklistProvider context wrapper causing default value issues.
Pattern: Rate limit too restrictive for user actions causing 429 errors.
