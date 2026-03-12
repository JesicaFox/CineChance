# Bug: Actors ranking incorrect and slow loading on /profile/actors
Date: 2026-03-11  
**Status**: ✅ FIXED - See [2026-03-11-actors-ranking-fixed.md](2026-03-11-actors-ranking-fixed.md)

## Description
Users experience:
1. Long loading times (up to 60+ seconds) when visiting /profile/actors page
2. Incorrect actor ranking - inconsistent ordering across pagination/sorting
3. Incorrect average rating calculation (simple mean instead of weighted)
4. Zero counts for watched movies in some cases

## Steps to Reproduce
1. User with extensive watchlist (100+ movies) logs in
2. Navigates to /profile/actors
3. Page shows loading progress bar for 30-60 seconds
4. After loading, actors appear ranked by wrong criteria
5. Some actors show "0" watched movies despite having watched several films with them
6. Ratings don't match the user's actual weighted ratings

## Expected Behavior
- Page loads quickly (< 3 seconds)
- Actors ranked correctly by a comprehensive score reflecting user's engagement
- Average rating reflects weighted average (accounting for rewatches)
- Watched movie counts are accurate
- Top 50 actors display correctly with proper progress percentages

## Actual Behavior
- Slow loading due to 1000+ TMDB API calls
- Sorting uses different criteria in singleLoad (by actor_score) vs paginated (by rating/progress) modes
- Average rating is arithmetic mean, not weighted by watchCount
- Some counts show 0 due to filtering issues

## Localization

### Files Involved
- `src/app/profile/actors/ActorsClient.tsx` - Frontend component, fetches from API
- `src/app/api/user/achiev_actors/route.ts` - Main API endpoint with heavy TMDB logic
- `src/lib/taste-map/person-profile-v2.ts` - Precomputed person profiles (unused by actors page)
- `src/app/profile/actors/page.tsx` - Server component that triggers profile computation
- `src/lib/taste-map/actor-rating.ts` - Weighted rating calculation (unused by AchvActors API)

### Root Cause Analysis

**Primary Issue: Duplicate Data Pipelines**
The system has two separate ways to compute actor statistics:
1. `computeUserPersonProfile()` in person-profile-v2.ts (used by taste-map, ML algorithms)
2. `achiev_actors` API endpoint (used by /profile/actors page)

These pipelines use completely different approaches and produce inconsistent results.

**Detailed Problems:**

1. **Performance - Excessive TMDB Calls** (achiev_actors/route.ts, lines 162-514)
   - For each watched movie: calls `fetchMediaDetails` + `fetchMovieCredits` (2 per movie)
   - For each of top 50 actors: calls `fetchPersonCredits` and then processes up to 100 movies
   - For each of those 100 movies: calls `fetchMediaDetails` again
   - Total: ~2000+ TMDB API calls on first load
   - Cache: only 24h in-memory for person credits, no cache for movie details
   - Causes 60+ second load times

2. **Weighted Rating Not Used** (achiev_actors/route.ts, lines 321-323)
   ```typescript
   average_rating: actorData.ratings.length > 0
     ? Number((actorData.ratings.reduce((a, b) => a + b, 0) / actorData.ratings.length).toFixed(1))
     : null
   ```
   - Simple arithmetic mean
   - Ignores `watchCount` field from WatchList
   - Contrast with `getActorWeightedRating` in actor-rating.ts which correctly weights by watchCount

3. **Inconsistent Sorting** (achiev_actors/route.ts, lines 407 vs 474-490)
   - `singleLoad=true` (page uses this): sorts by `actor_score` (custom formula)
   - Paginated mode: sorts by `average_rating`, then `progress_percent`, then name
   - Different formulas lead to different rankings

4. **Potential Count Discrepancies**
   - `watched_movies` = `watchedIds.size + rewatchedIds.size` (line 316) is correct
   - However, `rewatchedIds` only gets populated for REWATCHED status (line 271)
   - One film cannot be in both WATCHED and REWATCHED due to composite key
   - Should be correct, but simplification using precomputed data would be safer

5. **Unused Infrastructure**
   - `page.tsx` line 19-22 calls `computeUserPersonProfile()` to update PersonProfile
   - But `ActorsClient` ignores this and makes separate heavy computation via API
   - Wasted computation and inconsistent data

**Secondary Issue: Missing Data in PersonProfile**
`PersonProfile.topPersons` currently only contains:
- `tmdbPersonId`
- `name`
- `count` (number of user's movies with person)
- `avgWeightedRating` (weighted average)

Missing for /profile/actors display:
- `profile_path` (photo URL from TMDB)
- `watched_movies`, `rewatched_movies`, `dropped_movies` (counts by status)
- `total_movies` (filmography size)
- `progress_percent` (watched/total)
- `actor_score` (final ranking score)

## Impact
- **User Experience**: 60+ second load times frustrate users, may cause abandonment
- **Data Quality**: Inconsistent rankings confuse users about their favorite actors
- **Resource Abuse**: Unnecessary TMDB API calls waste rate limits and bandwidth
- **Technical Debt**: Two divergent code paths for same logical feature

## Solution Strategy

**Core Idea**: Eliminate heavy TMDB computation in AchvActors API. Use precomputed PersonProfile data that is already computed in background.

**Architecture Changes:**

1. **Extend PersonData Interface** (person-profile-v2.ts)
   Add all required fields for actor display:
   ```typescript
   export interface PersonData {
     tmdbPersonId: number;
     name: string;
     count: number;
     avgWeightedRating: number;
     // New fields:
     profile_path: string | null;
     watched_movies: number;
     rewatched_movies: number;
     dropped_movies: number;
     total_movies: number;  // Filmography size (from TMDB, cached)
     progress_percent: number;
     actor_score: number;
   }
   ```

2. **Enhance computeUserPersonProfile** (person-profile-v2.ts)
   - Generate the extended PersonData with all metrics
   - For `total_movies` (filmography size), fetch from TMDB once per actor and cache in DB (new table or extended cache)
   - For `profile_path`, store in PersonData (obtain from first movie credit or TMDB person endpoint)
   - Calculate `progress_percent = (count / total_movies) * 100` (or fallback)
   - Calculate `actor_score` using `calculateActorScore` formula
   - Also populate `watched_movies`, `rewatched_movies`, `dropped_movies` via efficient SQL counting (single query per person)
   - Store all in `PersonProfile.topPersons` (now extended JSON)

3. **Modify AchvActors API** (achiev_actors/route.ts)
   Replace heavy TMDB logic with:
   - Fetch `PersonProfile` for user and type 'actor'
   - Parse `topPersons` array (already sorted by score from compute)
   - Apply limit/offset
   - Map to `ActorAchievement` format (with minimal transformation)
   - No TMDB calls, no batching, no per-actor loops
   - Keep cache TTL at 1 hour

4. **Adjust page.tsx**
   - Replace `computeUserPersonProfile` with `getUserPersonProfile` (non-blocking, triggers compute only if stale)
   - This doesn't block page rendering; background compute happens in API anyway

5. **Create PersonFilmography Cache** (optional but recommended)
   New table to cache filmography counts for actors:
   ```
   model PersonFilmography {
     personId        Int
     mediaType       String? // 'movie' | 'tv' | null for total
     totalMovies     Int
     lastFetchedAt   DateTime
     @@unique([personId, mediaType])
   }
   ```
   Or extend `MoviePersonCache` with a materialized view approach.

6. **Synchronize Sorting**
   - Ensure computeUserPersonProfile sorts topPersons by `actor_score` DESC
   - AchvActors API returns that pre-sorted order
   - Both modes now consistent

## Test Plan (RED Phase)

Before implementing fix, write a failing test that demonstrates the bug:

**Test File**: `src/app/api/user/__tests__/achiev_actors.test.ts` (new)

**Test Case**: `returns correct weighted ratings and counts from personProfile`

```typescript
describe('achiev_actors API - PersonProfile integration', () => {
  it('should use PersonProfile data instead of heavy TMDB calls', async () => {
    // Mock PersonProfile with extended fields
    const mockPersonProfile = {
      topPersons: [
        {
          tmdbPersonId: 1,
          name: 'Test Actor',
          count: 5,
          avgWeightedRating: 8.5,
          profile_path: '/test.jpg',
          watched_movies: 5,
          rewatched_movies: 2,
          dropped_movies: 0,
          total_movies: 20,
          progress_percent: 25,
          actor_score: 85.5,
        },
      ],
    };

    // Mock prisma.personProfile.findUnique to return mock
    // Mock User session
    // Call GET /api/user/achiev_actors?limit=50&singleLoad=true
    // Expect:
    // - Response actors array has correct fields
    // - average_rating = 8.5 (from avgWeightedRating)
    // - watched_movies = 5
    // - rewatched_movies = 2
    // - total_movies = 20
    // - progress_percent = 25
    // - NO calls to fetchMediaDetails or fetchMovieCredits (verify mocks not called)
  });

  it('should sort by actor_score and respect limit', async () => {
    // Mock PersonProfile with multiple actors sorted by actor_score DESC
    // Ensure API returns top N only
    // Verify order matches
  });

  it('should handle empty PersonProfile gracefully', async () => {
    // Mock empty topPersons
    // Expect empty array and proper response structure
  });
});
```

**Current State**: This test would fail because:
1. AchvActors API does not query PersonProfile
2. It tries to make TMDB calls (which would need extensive mocking)
3. It uses simple average instead of weighted

**GREEN Phase**: Implement solution steps above to make test pass.

**REFACTOR Phase**: Clean up unused code, ensure type safety, add proper error handling if PersonProfile missing.

## Acceptance Criteria

- [ ] API response time for /api/user/achiev_actors?limit=50 is < 500ms (excluding network)
- [ ] No TMDB API calls are made inside AchvActors API (verify via mock/log inspection)
- [ ] average_rating matches weighted rating from PersonProfile
- [ ] Sorting is consistent across singleLoad and paginated modes (by actor_score)
- [ ] All counts (watched, rewatched, dropped, total) are accurate and non-zero when data exists
- [ ] Profile photos (profile_path) display correctly
- [ ] Existing tests continue to pass (no regressions)
- [ ] ESLint passes with zero warnings
- [ ] TypeScript compilation succeeds with zero errors

## Additional Notes

**Performance Target**: The current singleLoad mode makes all actors wait for TMDB calls. Switching to PersonProfile reduces to single DB query (cached), expect < 100ms.

**Consistency**: PersonProfile is already computed by page.tsx and by background jobs (incremental updates). This ensures /profile/actors, /profile/taste-map, and recommendation algorithms all agree on actor statistics.

**Migration**: Need to backfill PersonProfile with extended fields for existing users. Could run a one-time script after deployment to recompute all profiles with new logic.

**Fallback**: If PersonProfile data is stale or missing, API should trigger async recompute and return cached/empty data gracefully (not error).
