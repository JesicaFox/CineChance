---
status: resolved
pattern_group: pagination
original_files:
  - 2026-02-13-pagination-duplicate-movies.md
  - 2026-02-14-pagination-missing-stats-pages.md
  - 2026-02-16-anime-cartoon-filters.md (pagination component)
merged_date: 2026-02-19
severity: high
impact_pages:
  - /my-movies
  - /stats/genres/[genre]
  - /stats/ratings/[rating]
  - /stats/tags/[tagId]
---

# Debug Session: Pagination System Failures

## Summary

**Trigger:** Multiple interconnected pagination bugs causing duplicate movies, missing pages, and infinite scroll failures across the application.

**Root Cause Category:** Algorithmic errors in pagination logic + Prisma sorting instability

**Fix Complexity:** Medium (touched 9+ files, required understanding Prisma internals)

---

## Initial Symptoms

1. **Duplicate Movies Bug (2026-02-13)**
   - Expected: Each page shows unique movies, 20 per page
   - Actual: Same movies appeared on multiple pages, creating infinite duplicates
   - Reproduction: Scroll on "Мои фильмы" or stats detail pages

2. **Missing Pagination Bug (2026-02-14)**
   - Expected: "Load more" button appears when more data exists
   - Actual: No pagination controls after previous "fix"
   - Reproduction: Visit any stats detail page after duplicate fix

3. **Anime Filter Empty Page (2026-02-16)**
   - Expected: Selecting "Anime" filter shows anime movies
   - Actual: Empty page when only "Anime" selected
   - Reproduction: My Movies page → select Anime filter only

---

## Investigation Timeline

### Phase 1: Evidence Gathering

**Evidence 1:** Found problematic pagination code in `src/app/api/my-movies/route.ts`:
```typescript
// CRITICAL BUG: skip was ALWAYS 0
const recordsNeeded = Math.ceil(page * limit * 1.5) + 1;
const skip = 0; // Always from beginning!
const take = Math.min(recordsNeeded, 500);
```

**Evidence 2:** Discovered Prisma issue #23615 - non-unique orderBy fields cause unstable sorting

**Evidence 3:** Found inconsistent hasMore calculation across files:
- Some used `sortedMovies.length > pageEndIndex`
- Others used `watchListRecords.length === take`
- None used the correct "take = limit + 1" pattern

### Phase 2: Hypothesis Formation

**Hypothesis 1:** Skip=0 causes duplicate fetches (CONFIRMED)
- Each page fetched from start, slice different ranges
- But slices overlapped due to filter/sort mismatch

**Hypothesis 2:** Missing secondary sort by ID causes unstable ordering (CONFIRMED)
- Prisma returns different order for same query across pages
- Caused "phantom duplicates" - same movie, different positions

**Hypothesis 3:** hasMore calculation doesn't account for filtered data (CONFIRMED)
- Total count from DB ≠ filtered count after client-side processing
- UI showed "no more" when data existed

### Phase 3: Fix Implementation

**Fix Pattern Established:**
```typescript
// 1. Correct skip/take
const skip = (page - 1) * limit;
const take = limit + 1; // +1 to detect hasMore

// 2. Stable sorting with secondary key
orderBy: [{ addedAt: 'desc' }, { id: 'desc' }]

// 3. Correct hasMore
def applyPagination(sortedMovies: Movie[], page: number, limit: number) {
  const paginatedMovies = sortedMovies.slice(0, limit);
  const hasMore = watchListRecords.length > limit; // Check raw DB result
  return { movies: paginatedMovies, hasMore };
}

// 4. Secondary sort in JavaScript
if (comparison === 0) {
  comparison = a.id - b.id;
}
```

### Phase 4: Regression & Second Bug

After applying fix #1, discovered **new bug**: pagination controls disappeared entirely.

**Root cause:** Overzealous removal of hasMore logic during first fix.

**Lesson:** Partial fixes without full context create new bugs.

---

## Technical Deep Dive

### Why skip=0 Was Used (Original Intent vs Reality)

**Original Developer Intent:**
> "Always fetch from beginning for deterministic results"

**The Flaw:** 
- Intent was correct (deterministic ordering)
- Implementation was wrong (should use proper orderBy, not skip=0)
- Result: Deterministic but WRONG results

### Prisma Sorting Instability

**The Problem:**
```typescript
// This is UNSTABLE for pagination
orderBy: { addedAt: 'desc' }
// Multiple movies added at same timestamp → undefined order
```

**Prisma Documentation Quote:**
> "When ordering by non-unique fields, the order of records with equal values is not guaranteed and may vary between queries."

**Solution:** Always add unique secondary sort:
```typescript
orderBy: [{ addedAt: 'desc' }, { id: 'desc' }] // Stable!
```

### The Filtered Pagination Trap

**Architecture Issue:**
- DB query returns raw watchlist records
- Client-side filtering applies (anime/cartoon/status)
- Original hasMore used `totalCount` from DB (wrong!)
- Should use `filteredResults.length > limit`

**Code Pattern for Filtered Pagination:**
```typescript
// WRONG:
const hasMore = totalCount > (page * limit);

// RIGHT:
const filtered = applyFilters(allRecords, filters);
const hasMore = filtered.length > (page * limit);
```

---

## Files Changed

### API Routes
1. `src/app/api/my-movies/route.ts` - Core pagination logic
2. `src/app/api/stats/movies-by-genre/route.ts` - Stats pagination
3. `src/app/api/stats/movies-by-rating/route.ts` - Stats pagination
4. `src/app/api/stats/movies-by-tag/route.ts` - Stats pagination

### Actions
5. `src/app/my-movies/actions.ts` - Server actions pagination
6. `src/app/actions/tagsActions.ts` - Tag query ordering

### Debug/Diagnostic APIs
7. `src/app/api/logs/stats/route.ts` - Sample queries
8. `src/app/api/debug/stats/route.ts` - Debug queries
9. `src/app/api/debug/real-status-ids/route.ts` - Status queries

### Client Components (Filter-Related)
10. `src/app/my-movies/FilmFilters.tsx` - Added cartoon filter
11. `src/app/my-movies/MyMoviesContentClient.tsx` - Fixed filter logic
12. `src/app/components/FilmGridWithFilters.tsx` - Filter propagation

---

## Deep Reflection: Systemic Patterns

### Pattern 1: Copy-Paste Anti-Pattern

**Observation:** All 4 pagination implementations (my-movies, genre, rating, tag) had the SAME bug.

**Root Cause:** Code was copy-pasted without understanding the underlying pattern.

**Systemic Issue:** 
- No shared pagination utility
- Each API route reimplemented pagination
- Fix required touching 4+ files with identical changes

**Recommendation:** 
```typescript
// Create shared utility
// src/lib/pagination.ts
export function createPaginationConfig(limit: number, page: number) {
  return {
    skip: (page - 1) * limit,
    take: limit + 1, // For hasMore detection
    orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
  };
}
```

### Pattern 2: "Magic Numbers" Anti-Pattern

**Observation:** Values like `* 1.5`, `500`, `Math.ceil()` appeared without explanation.

**Code:**
```typescript
const recordsNeeded = Math.ceil(page * limit * 1.5) + 1; // Why 1.5?
const take = Math.min(recordsNeeded, 500); // Why 500?
```

**Root Cause:** 
- Developer tried to "optimize" without clear requirements
- No comments explaining business logic
- "It works in testing" (with small datasets)

**Lesson:** Every magic number needs a comment or named constant.

### Pattern 3: Filter Logic Duplication

**Observation:** Anime/cartoon filter logic was implemented differently in 5+ places.

**Inconsistencies Found:**
- Some checked `original_language === 'ja'`
- Others checked `genre.id === 16`
- Some had precedence issues (anime vs cartoon)

**Recommendation:** 
```typescript
// Single source of truth
// src/lib/contentType.ts
export function classifyContent(movie: Movie): 'movie' | 'tv' | 'anime' | 'cartoon' {
  if (hasGenre(movie, 16)) {
    return movie.original_language === 'ja' ? 'anime' : 'cartoon';
  }
  return movie.media_type;
}
```

### Pattern 4: Testing Gap

**Why This Bug Survived:**
- Pagination not tested with >20 items
- Filter combinations not tested
- Sorting stability not verified
- "Works on my machine" (with 5 test movies)

**Recommendation:** 
- Add pagination tests with 100+ items
- Test all filter combinations
- Verify sorting stability across pages

---

## Prevention Strategies

### For Developers
1. **Never implement pagination from scratch** - use shared utilities
2. **Always add secondary sort** by unique field (id, uuid)
3. **Document magic numbers** with business justification
4. **Test with production-scale data** (not just 5 items)

### For Code Review
1. **Check pagination math:** `skip = (page - 1) * limit`
2. **Verify hasMore logic:** uses raw count, not filtered
3. **Confirm orderBy includes unique field**
4. **Look for copy-paste:** same code in multiple files

### For Architecture
1. **Create Pagination SDK** - shared, tested utility
2. **Add pagination linting rules** - catch common mistakes
3. **Standardize filter logic** - single classification function
4. **Add integration tests** - pagination + filtering together

---

## Verification Checklist

- [x] All 4 API routes use correct skip/take
- [x] All queries have `{ id: 'desc' }` secondary sort
- [x] JavaScript sort functions have id fallback
- [x] hasMore uses `records.length > limit` pattern
- [x] Anime/cartoon filters work consistently
- [x] Tested with 100+ movies in watchlist
- [x] Tested all filter combinations
- [x] No duplicate movies across pages

---

## Related Incidents

- **Rate Limit Issues:** Pagination caused excessive API calls (see rate-limit resolved sessions)
- **Performance Issues:** skip=0 + large take caused slow queries (see performance.md)

---

## Final Notes

This incident reveals a fundamental architectural debt: pagination was treated as "simple" and implemented ad-hoc in multiple places. The "simple" feature required 3 separate bug fixes over 3 days because the complexity was underestimated.

**Key Takeaway:** Even "simple" features need shared utilities and standardized patterns when they appear in multiple places.
