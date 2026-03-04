---
status: resolved
trigger: "Pagination only loads 1 movie instead of 20 on scroll, then duplicates"
created: 2026-03-04T17:15:00.000Z
updated: 2026-03-04T17:45:00.000Z
---

## Summary

**Root Cause:** Multiple regressions in pagination logic caused both:
1. Only 1 movie loading on scroll (incorrect buffer calculation)
2. Duplicates appearing (page-dependent buffer size)

## Investigation

### Previous Fixes Context
The pagination had been fixed multiple times:
1. **2026-02-19**: Original fix - use fixed buffer from start, then paginate in memory
2. **2026-03-04**: First attempt - changed to DB-level pagination (broke pagination)
3. **2026-03-04 v2**: Fixed hasMore to use totalCount (partial fix)
4. **2026-03-04 v3**: Reverted to memory pagination with page-dependent buffer (caused duplicates)

### The Problem

The code used `page * limit * 1.5` for buffer size:
- Page 1: take = 30 records
- Page 2: take = 60 records (DIFFERENT data!)
- Page 3: take = 90 records

Each page request fetched DIFFERENT data, causing:
1. Duplicates when data overlapped
2. Missing records when data didn't include them
3. Only 1 movie loading (if buffer exhausted)

### The Fix

Use **FIXED buffer size** based on whether filters are active, NOT page number:

```typescript
const hasFilters = hasTMDBFilters || minRating > 0 || maxRating < 10 || yearFrom || yearTo;
const BUFFER_SIZE = hasFilters ? 1000 : 100; // Fixed buffer

// Always fetch from start with fixed buffer
take: BUFFER_SIZE,
```

Now:
- Page 1: fetch first 100 records, slice(0, 20)
- Page 2: fetch first 100 records, slice(20, 40)
- Page 3: fetch first 100 records, slice(40, 60)

**Consistent data = no duplicates.**

### Why This Works

1. **Fixed buffer**: Same data fetched every request
2. **Secondary sort**: `[{ addedAt: 'desc' }, { id: 'desc' }]` ensures stable ordering
3. **Memory pagination**: slice() works on consistent sorted data

## Files Changed

- `src/app/api/my-movies/route.ts`
  - Changed from `page * limit * 1.5` to fixed `BUFFER_SIZE`
  - Added proper filter detection including rating/year

## Verification

- [x] Pagination loads 20 movies per page
- [x] No duplicate movies appear on scroll
- [x] Works without filters
- [x] Works with filters (type, year, rating, genre)
- [x] ESLint passes
- [x] All 57 tests pass

## Related

- `.planning/debug/resolved/pagination-system-failures.md`
- `.planning/debug/resolved/2026-02-19-14-15-my-movies-pagination.md`
