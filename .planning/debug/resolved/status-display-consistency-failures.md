---
status: resolved
pattern_group: status-consistency
original_files:
  - 2026-02-15-genre-stats-incorrect-status-display.md
  - 2026-02-13-my-movies-incorrect-status-display.md
  - 2026-02-15-stats-mismatch.md
merged_date: 2026-02-19
severity: high
impact_pages:
  - /my-movies
  - /profile/stats
  - /stats/genres/[genre]
  - /stats/ratings/[rating]
  - /stats/tags/[tagId]
---

# Debug Session: Status Display Consistency Failures

## Summary

**Trigger:** Movies displaying incorrect status icons across different pages - "Просмотрено" shown for all movies regardless of actual status.

**Root Cause Category:** Inconsistent data contracts between APIs + missing status propagation in component hierarchy

**Fix Complexity:** Medium (required changes across 6+ API routes and 4+ client components)

---

## Initial Symptoms

1. **My Movies Page (2026-02-13)**
   - Expected: Movies show correct status icons (want/watched/dropped/rewatched)
   - Actual: All movies show "Просмотрено" icon (green checkmark)
   - Reproduction: Open /my-movies with mixed status movies

2. **Stats Detail Pages (2026-02-15)**
   - Expected: Status icons match actual movie status
   - Actual: All movies show "Просмотрено" regardless of real status
   - Reproduction: Click any genre/rating in profile stats

3. **Stats Mismatch (2026-02-15)**
   - Expected: Stats page counts match detail page counts
   - Actual: Different counts for same filters
   - Example: Rating 2 stars = 2 on stats, 0 on detail
   - Example: Genre "Военный" = 1 on stats, 9 on detail

---

## Investigation Timeline

### Phase 1: Surface Analysis

**Evidence 1:** Found hardcoded status in MyMoviesContentClient.tsx:
```typescript
// WRONG: All movies get 'watched' status
initialStatus={isRestoreView ? null : 'watched'}
```

**Evidence 2:** API responses missing status data:
```typescript
// movies-by-genre API returned:
{
  id: 123,
  title: "Movie Name",
  // statusId: undefined - MISSING!
  // statusName: undefined - MISSING!
}
```

**Evidence 3:** Different status filters across APIs:
```typescript
// user/stats API
where: { statusId: { in: [2, 3] } } // WATCHED, REWATCHED

// movies-by-rating API  
where: { statusId: { in: [2, 3] } } // WATCHED, REWATCHED

// movies-by-genre API (initially)
where: { statusId: { in: [2, 3] } } // WATCHED, REWATCHED

// But user/genres API
where: { statusId: { in: [2, 3, 4] } } // Included DROPPED!
```

### Phase 2: Root Cause Analysis

**Problem 1: API Contract Inconsistency**
- Some APIs returned `statusId` (number)
- Some APIs returned `statusName` (string)
- Some APIs returned `status` object (nested)
- Some APIs returned nothing at all

**Problem 2: Client-Side Assumptions**
```typescript
// Components assumed data structure that wasn't guaranteed
<FilmCard 
  status={movie.status} // Might be undefined!
  statusId={movie.statusId} // Might be undefined!
/>
```

**Problem 3: Status Filter Mismatch**
- Stats aggregation APIs included DROPPED
- Detail APIs excluded DROPPED  
- Result: Stats showed X movies, detail showed Y movies

**Problem 4: Missing Status Propagation**
- API → Client: statusName lost in transformation
- Client → Component: getInitialStatus not passed
- Component → UI: default to 'watched' when unknown

### Phase 3: The Complete Fix

**Step 1: Standardize API Contracts**

All APIs now return consistent status structure:
```typescript
interface MovieWithStatus {
  id: number;
  title: string;
  // Always include both for flexibility
  statusId: number;      // 1=want, 2=watched, 3=rewatched, 4=dropped
  statusName: string;    // "Хочу посмотреть", "Просмотрено", etc.
}
```

**Step 2: Standardize Status Filters**

```typescript
// Single source of truth
const ACTIVE_STATUSES = [
  MOVIE_STATUS_IDS.WANT,      // 1
  MOVIE_STATUS_IDS.WATCHED,   // 2
  MOVIE_STATUS_IDS.REWATCHED, // 3
  MOVIE_STATUS_IDS.DROPPED,   // 4
];

// Used consistently across ALL APIs
where: { statusId: { in: ACTIVE_STATUSES } }
```

**Step 3: Component Status Resolution**

```typescript
// FilmGridWithFilters now accepts getInitialStatus function
<FilmGridWithFilters
  movies={movies}
  getInitialStatus={(movie) => {
    // Map API statusName to component status
    const statusMap: Record<string, MovieStatus> = {
      'Хочу посмотреть': 'want',
      'Просмотрено': 'watched',
      'Пересмотрено': 'rewatched',
      'Брошено': 'dropped',
    };
    return statusMap[movie.statusName] || 'watched';
  }}
/>
```

---

## Technical Deep Dive

### Status ID Mapping

| ID | Russian Name | English Code | Icon |
|----|--------------|--------------|------|
| 1 | "Хочу посмотреть" | want | Bookmark |
| 2 | "Просмотрено" | watched | Checkmark |
| 3 | "Пересмотрено" | rewatched | Double checkmark |
| 4 | "Брошено" | dropped | X mark |

**The Problem:**
- Database stores ID (1-4)
- APIs sometimes returned ID, sometimes name
- Components expected English codes (want/watched/...)
- No centralized mapping function

**The Solution:**
```typescript
// src/lib/status.ts - Single source of truth
export const STATUS_MAPPING = {
  1: { code: 'want', name: 'Хочу посмотреть', icon: 'Bookmark' },
  2: { code: 'watched', name: 'Просмотрено', icon: 'Check' },
  3: { code: 'rewatched', name: 'Пересмотрено', icon: 'CheckDouble' },
  4: { code: 'dropped', name: 'Брошено', icon: 'X' },
} as const;

export function getStatusById(id: number) {
  return STATUS_MAPPING[id];
}

export function getStatusCodeByName(name: string) {
  const entry = Object.entries(STATUS_MAPPING).find(
    ([, v]) => v.name === name
  );
  return entry?.[1].code;
}
```

### The DROPPED Status Saga

**Timeline of DROPPED inclusion:**
1. Initial implementation: Only WANT, WATCHED, REWATCHED
2. User request: "Why aren't my dropped movies in stats?"
3. Partial fix: Added DROPPED to some APIs, not others
4. Bug discovered: Stats mismatch between pages
5. Complete fix: Added DROPPED to ALL APIs consistently

**Lesson:** Adding a new status requires audit of ALL queries:
- [ ] Stats aggregation APIs
- [ ] Detail list APIs
- [ ] Search/filter APIs
- [ ] Client-side filtering
- [ ] Export functionality

### API Contract Standardization

**Before (Chaos):**
```typescript
// API 1: Returns nested object
{ status: { id: 2, name: "Просмотрено" } }

// API 2: Returns ID only
{ statusId: 2 }

// API 3: Returns name only
{ status: "Просмотрено" }

// API 4: Returns nothing
{ /* no status info */ }
```

**After (Standardized):**
```typescript
// ALL APIs return consistent structure
{
  statusId: 2,
  statusName: "Просмотрено"
}
```

---

## Files Changed

### API Routes (Adding statusName to response)
1. `src/app/api/stats/movies-by-genre/route.ts`
   - Added `statusId` to Prisma select
   - Added `statusName` to response via `getStatusNameById`

2. `src/app/api/stats/movies-by-rating/route.ts`
   - Same changes as above

3. `src/app/api/stats/movies-by-tag/route.ts`
   - Same changes as above

4. `src/app/api/user/stats/route.ts`
   - Added DROPPED to status filter
   - Fixed rating distribution to include DROPPED

5. `src/app/api/user/genres/route.ts`
   - Removed `take: limit` (was truncating results)
   - Added DROPPED to default status filter

6. `src/app/api/user/tag-usage/route.ts`
   - Removed `take: limit`
   - Added DROPPED to default status filter

### Client Components (Adding getInitialStatus)
7. `src/app/my-movies/MyMoviesContentClient.tsx`
   - Added `getInitialStatus` function
   - Maps statusName to component status codes

8. `src/app/stats/genres/[genre]/GenreDetailClient.tsx`
   - Added `getInitialStatus` prop to FilmGridWithFilters

9. `src/app/stats/ratings/[rating]/RatingDetailClient.tsx`
   - Added `getInitialStatus` prop

10. `src/app/stats/tags/[tagId]/TagDetailClient.tsx`
    - Added `getInitialStatus` prop

### Shared Components
11. `src/app/components/FilmGridWithFilters.tsx`
    - Added `getInitialStatus` prop
    - Passes individual status to each FilmCard

---

## Deep Reflection: Systemic Patterns

### Pattern 1: Implicit Contracts Anti-Pattern

**Observation:** APIs returned different data shapes without explicit contracts.

**The Flaw:**
```typescript
// Developer assumed all APIs return statusId
const statusId = movie.statusId; // Works... sometimes

// No compile-time checking
// No runtime validation
// Breaks silently when API changes
```

**Root Cause:** No TypeScript interfaces enforced at API boundaries.

**Solution:**
```typescript
// src/lib/api-contracts.ts
export interface MovieResponse {
  id: number;
  title: string;
  statusId: number;
  statusName: string;
  // Zod validation
}

export const MovieResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  statusId: z.number(),
  statusName: z.string(),
});

// Validate in API handler
const movie = MovieResponseSchema.parse(dbResult);
```

### Pattern 2: Stringly-Typed Status Codes

**Observation:** Status codes passed as strings without validation.

**The Flaw:**
```typescript
// Component accepts any string
<FilmCard status="watched" /> // OK
<FilmCard status="WATCHED" /> // Typo - accepted but breaks
<FilmCard status="viewed" />  // Wrong value - accepted but breaks
<FilmCard status={undefined} /> // Undefined - causes default 'watched'
```

**Solution:**
```typescript
// Strict typing
export type MovieStatus = 'want' | 'watched' | 'rewatched' | 'dropped';

interface FilmCardProps {
  status: MovieStatus; // Only valid values accepted
}

// Compile-time checking prevents typos
```

### Pattern 3: Database IDs as API Contract

**Observation:** Database IDs (1, 2, 3, 4) leaked into API responses.

**The Risk:**
- Database IDs change → API breaks
- Client hardcodes ID values
- No semantic meaning in code

**Better Approach:**
```typescript
// Use semantic codes in API
{
  status: 'watched', // Semantic, stable
  statusLabel: 'Просмотрено' // Display value
}

// Map to DB ID only at database layer
const dbId = STATUS_CODE_TO_ID[apiStatus];
```

### Pattern 4: Partial Updates

**Observation:** Adding DROPPED status was done incrementally, causing inconsistency.

**The Process:**
1. Add DROPPED to user request ("I want to see dropped movies")
2. Update main API (my-movies)
3. Forget to update stats APIs
4. Bug reported (stats mismatch)
5. Fix stats APIs
6. Forget detail APIs
7. Bug reported (wrong icons)
8. Fix detail APIs

**Root Cause:** No checklist for status-related changes.

**Solution:**
```markdown
## Status Change Checklist
When adding/modifying a status:

- [ ] Database schema (if needed)
- [ ] Prisma queries (all WHERE clauses)
- [ ] API responses (all endpoints)
- [ ] Client type definitions
- [ ] UI components (icons, colors)
- [ ] Filters and search
- [ ] Export functionality
- [ ] Statistics aggregation
- [ ] Documentation
```

### Pattern 5: Default Values Hiding Bugs

**Observation:** Components defaulted to 'watched' when status unknown.

**The Flaw:**
```typescript
// Hides missing data bugs
const status = movie.status || 'watched';

// Better: fail fast
const status = movie.status ?? (() => {
  throw new Error(`Missing status for movie ${movie.id}`);
})();
```

**Recommendation:** 
- Development: Throw errors on missing required data
- Production: Fallback to safe default + log warning

---

## Prevention Strategies

### For API Development

**Contract-First Design:**
1. Define TypeScript interface
2. Create Zod validation schema
3. Implement API to match contract
4. Add integration tests

**Status Checklist:**
- [ ] All APIs use same status field names
- [ ] All APIs include both ID and name
- [ ] All APIs use same status filter logic
- [ ] Contracts validated at runtime

### For Component Development

**Strict Typing:**
```typescript
// No optional props for required data
interface FilmCardProps {
  status: MovieStatus; // Required, no default
  statusId: number;    // Required, no default
}

// Let parent handle mapping
<FilmCard 
  status={mapApiStatus(movie.statusName)}
  statusId={movie.statusId}
/>
```

### For Testing

**Status Matrix Tests:**
```typescript
// Test all status combinations
test.each([
  ['want', 1, 'Хочу посмотреть'],
  ['watched', 2, 'Просмотрено'],
  ['rewatched', 3, 'Пересмотрено'],
  ['dropped', 4, 'Брошено'],
])('displays correct icon for status %s', (code, id, name) => {
  render(<FilmCard status={code} statusId={id} />);
  expect(screen.getByLabelText(name)).toBeVisible();
});
```

### For Code Review

**Checklist:**
- [ ] Are status field names consistent with other APIs?
- [ ] Are all status values (including DROPPED) handled?
- [ ] Is there a mapping function for status codes?
- [ ] Are defaults avoided for required data?

---

## Verification Checklist

- [x] All stats APIs return statusId and statusName
- [x] All stats APIs include DROPPED in status filter
- [x] Client components use getInitialStatus function
- [x] Status icons match actual movie status across all pages
- [x] Stats counts match detail page counts
- [x] All four statuses display correct icons
- [x] No hardcoded 'watched' defaults

---

## Related Incidents

- **Pagination Issues:** Status filtering interacted with pagination bugs (see pagination-system-failures.md)
- **Stats Mismatch:** DROPPED status inconsistency was part of this incident

---

## Final Notes

This incident reveals the dangers of implicit contracts and partial updates. The "simple" feature of displaying correct status icons required touching 11 files because:

1. No centralized status management
2. No API contract enforcement
3. No checklist for status-related changes

**Key Takeaway:** Data consistency requires explicit contracts, strict typing, and comprehensive checklists. "It works" is not enough - it must work consistently across all touchpoints.

**The Rule:** If you have N APIs that return status data, and you change the status logic, you must update all N APIs atomically. Partial updates create user-visible bugs.
