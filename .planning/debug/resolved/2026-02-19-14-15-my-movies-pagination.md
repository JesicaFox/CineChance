---
status: resolved
trigger: "На странице Мои фильмы сломалась пагинация (подгрузка при скролле)"
created: 2026-02-19T14:15:00.000Z
updated: 2026-02-19T15:30:00.000Z
---

## Summary

**Root Cause:** Client-side filtering (types, year, rating, genres) was incompatible with database-level pagination.

When using `skip/take` pagination:
- DB returns records 160-180 (page 9)
- After client-side filtering, only 21 movies remained
- `slice(160, 180)` on 21 items = empty result

**Solution:** Fetch all records from start (skip=0) with sufficient buffer, then apply filters and paginate in memory.

## Technical Details

### The Problem

**Original code:**
```typescript
// WRONG: DB pagination incompatible with client-side filtering
const skip = (page - 1) * limit;  // 160 for page 9
const take = limit + 1;           // 21 records

const records = await prisma.watchList.findMany({
  skip,  // 160
  take,  // 21
  // ...
});

// After filtering: only 21 movies match
const filtered = records.filter(...);  // 21 movies
const paginated = filtered.slice(160, 180);  // EMPTY!
```

**Why it failed:**
- DB returns records at positions 160-180
- But after filtering, we have only 21 total movies
- Trying to slice positions 160-180 from 21 items returns nothing

### The Fix

**Final implementation:**
```typescript
// CORRECT: Fetch from start with buffer for filtering
const hasFilters = (
  (typesParam && typesParam !== 'all') ||
  (yearFrom || yearTo) ||
  (minRating > 0 || maxRating < 10) ||
  (genresParam)
);

const recordsNeeded = hasFilters ? 1000 : Math.ceil(page * limit * 1.5);
const skip = 0;
const take = recordsNeeded;

const records = await prisma.watchList.findMany({
  skip: 0,              // Always from start
  take: recordsNeeded,  // Enough for filters + pagination
  // ...
});

// Apply filters to ALL fetched records
const filtered = records.filter(...);

// Then paginate
const paginated = filtered.slice((page - 1) * limit, page * limit);
const hasMore = filtered.length > page * limit;
```

**Why it works:**
- Fetches first 1000 records (or calculated buffer without filters)
- Applies client-side filters to all 1000
- Slices the filtered result for requested page
- `hasMore` checks filtered length, not DB count

### Performance Considerations

**Without filters:**
- Uses 1.5x buffer: `page * 20 * 1.5`
- Efficient for most users

**With filters:**
- Fetches up to 1000 records
- Higher memory usage but ensures correct pagination
- Trade-off: accuracy vs performance

**Future improvement:**
Move type/year/rating/genre filters to database level for true server-side pagination.

## Files Changed

- `src/app/api/my-movies/route.ts`
  - Pagination logic (lines 280-305)
  - hasMore calculation (line 446)

## Verification

- [x] Infinite scroll works without filters
- [x] Infinite scroll works with type filters (anime, cartoon, etc.)
- [x] Infinite scroll works with year filters
- [x] Infinite scroll works with rating filters
- [x] Infinite scroll works with genre filters
- [x] Combined filters work correctly
- [x] No duplicate movies
- [x] No "More" button appears (pure infinite scroll)

## Related

- `.planning/debug/resolved/pagination-system-failures.md` - Previous pagination fixes
- `.planning/debug/resolved/my-movies-pagination-regression.md` - Intermediate attempts
