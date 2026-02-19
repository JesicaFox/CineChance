---
status: resolved
pattern_group: api-architecture
original_files:
  - 2026-02-15-person-api-error.md
  - 2026-02-15-server-actions-error.md
  - 2026-02-13-cinechance-rating-not-fetched.md
merged_date: 2026-02-19
severity: medium
impact_areas:
  - Server Actions usage patterns
  - Error handling strategy
  - API route architecture
  - Client-side data fetching
---

# Debug Session: API Architecture & Server Actions Failures

## Summary

**Trigger:** Invalid Server Actions requests, unhandled API errors causing page crashes, and data not loading due to incorrect conditional logic.

**Root Cause Category:** Server Actions misuse + inconsistent error handling + incorrect loading patterns

**Fix Complexity:** Medium (required architectural decisions on Server Actions vs API Routes, error handling standardization)

---

## Initial Symptoms

1. **Server Actions Error (2026-02-15)**
   - Expected: Data loads in client components
   - Actual: "Invalid Server Actions request" error in console
   - Reproduction: Visit my-movies, profile/stats, any stats detail page

2. **Person API Errors (2026-02-15)**
   - Expected: Actor page shows actor info even if TMDB slow
   - Actual: "Failed to fetch person" crashes page
   - Reproduction: Visit actor page with slow TMDB

3. **CineChance Rating Not Fetched (2026-02-13)**
   - Expected: Modal shows CineChance community rating
   - Actual: Shows TMDB rating instead
   - Reproduction: Open movie modal, check rating tab

---

## Investigation Timeline

### Phase 1: Server Actions Mystery

**Evidence:** Found dynamic imports in useEffect:
```typescript
// WRONG: Dynamic import of Server Action in Client Component
useEffect(() => {
  const fetchData = async () => {
    const { getUserGenres } = await import('./actions');
    const genres = await getUserGenres(userId);
  };
  fetchData();
}, [userId]);
```

**The Error:**
```
Invalid Server Actions request
```

**Root Cause:** Next.js Server Actions are designed for:
1. Direct imports in Server Components
2. Form submissions (POST)
3. NOT for dynamic import in useEffect

**Why It Failed:**
- Dynamic import happens client-side
- Server Action expects server context
- Request signature invalid
- Next.js rejects with cryptic error

**The Fix:** Replace Server Actions with API Routes:
```typescript
// CORRECT: Use fetch to API route
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/user/genres?limit=100');
    const data = await response.json();
    setGenres(data.genres);
  };
  fetchData();
}, []);
```

### Phase 2: Error Handling Strategy

**Evidence:** Person API crashed on network errors:
```typescript
// WRONG: Unhandled promise rejection
const personData = await fetchFromTMDB(personId);
// If fetch fails, entire page crashes
```

**The Disaster Scenario:**
1. User visits actor page
2. TMDB API times out (5 seconds)
3. Unhandled rejection crashes React
4. User sees blank page or error boundary
5. No graceful degradation

**The Fix:** Comprehensive error handling:
```typescript
// CORRECT: Graceful error handling
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const personId = params.id;
    
    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${TMDB_API}/person/${personId}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Person not found' },
          { status: 404 }
        );
      }
      throw new Error(`TMDB error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Fetch filmography separately (non-critical)
    let credits = null;
    try {
      credits = await fetchFilmography(personId);
    } catch (e) {
      logger.warn('Failed to fetch filmography', { personId, error: e });
      // Non-critical, continue without it
    }
    
    return NextResponse.json({ ...data, credits });
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', partial: true },
        { status: 504 }
      );
    }
    
    logger.error('Person API error', { error });
    return NextResponse.json(
      { error: 'Failed to load person data' },
      { status: 500 }
    );
  }
}
```

### Phase 3: Conditional Loading Bug

**Evidence:** Rating never loaded due to impossible condition:
```typescript
// WRONG: Impossible condition
const [cineChanceRating, setCineChanceRating] = useState(initialAverageRating);

useEffect(() => {
  // This condition NEVER true because initialAverageRating is always set
  if (cineChanceRating === null && movie.id && movie.media_type) {
    fetchCineChanceRating();
  }
}, [movie.id, movie.media_type]);
```

**The Bug:**
1. `cineChanceRating` initialized with `initialAverageRating` (TMDB rating)
2. Condition checks `cineChanceRating === null`
3. Since it's initialized with a value, condition always false
4. API never called
5. Always shows TMDB rating

**The Fix:** Always load on mount:
```typescript
// CORRECT: Load on mount, don't depend on state
useEffect(() => {
  if (!movie.id || !movie.media_type) return;
  
  const fetchCineChanceRating = async () => {
    try {
      const res = await fetch(
        `/api/cine-chance-rating?tmdbId=${movie.id}&mediaType=${movie.media_type}`
      );
      if (res.ok) {
        const data = await res.json();
        setCineChanceRating(data.averageRating);
        setCineChanceVoteCount(data.count);
      }
    } catch (error) {
      logger.error('Failed to fetch CineChance rating', { error });
    }
  };
  
  fetchCineChanceRating();
}, [movie.id, movie.media_type]);
```

---

## Technical Deep Dive

### Server Actions vs API Routes Decision Matrix

| Scenario | Server Actions | API Routes | Why |
|----------|---------------|------------|-----|
| Form submission | ✅ | ✅ | Both work |
| Server Component data fetch | ✅ | ✅ | Server Actions simpler |
| Client Component data fetch | ❌ | ✅ | Server Actions fail dynamically |
| File upload | ⚠️ | ✅ | API Routes more flexible |
| Real-time updates | ❌ | ✅ | WebSocket/SSE needed |
| Complex auth logic | ⚠️ | ✅ | API Routes easier to debug |

**Our Rule:**
- Server Actions: Server Components only, form submissions
- API Routes: Client Components, complex logic, file handling

### Error Handling Philosophy

**Before:** "Let it crash"
```typescript
const data = await fetchData(); // Crash if fails
```

**After:** "Graceful degradation"
```typescript
let data = null;
let error = null;

try {
  data = await fetchData();
} catch (e) {
  error = e;
  logger.error('Fetch failed', { error: e });
}

if (error) {
  return <ErrorState error={error} retry={refetch} />;
}

return <DataView data={data} />;
```

**The Middle Ground:**
```typescript
// For critical data: throw (can't proceed)
const user = await getUser(session.user.id);
if (!user) throw new Error('User not found');

// For non-critical data: fallback
const recommendations = await getRecommendations().catch(() => []);
// Continue without recommendations
```

### The Conditional Loading Anti-Pattern

**The Bug Pattern:**
```typescript
const [data, setData] = useState(initialData);

useEffect(() => {
  if (data === null) { // Never true if initialized
    fetchData();
  }
}, [id]);
```

**Why It Happens:**
- Developer wants to "avoid unnecessary fetches"
- Thinks "if I have initial data, don't fetch"
- But initial data might be stale/default
- Condition never triggers

**Better Patterns:**

**Pattern 1: Always Fetch on Mount**
```typescript
useEffect(() => {
  fetchData();
}, [id]); // Fetch whenever id changes
```

**Pattern 2: Stale-While-Revalidate**
```typescript
const { data, isLoading } = useSWR(`/api/data/${id}`, fetcher, {
  fallbackData: initialData // Use initial, but fetch fresh
});
```

**Pattern 3: Explicit Should Fetch**
```typescript
const shouldFetch = !initialData || isStale(initialData);

useEffect(() => {
  if (shouldFetch) {
    fetchData();
  }
}, [id, shouldFetch]);
```

---

## Files Changed

### Server Actions → API Routes Migration
1. `src/app/my-movies/page.tsx`
   - Removed Server Action imports
   - Now uses API routes exclusively

2. `src/app/my-movies/MyMoviesContentClient.tsx`
   - Replaced `getUserTags` Server Action with fetch('/api/user/tags')
   - Added loading states

3. `src/app/stats/genres/[genre]/GenreDetailClient.tsx`
   - Replaced all Server Actions with API calls

4. `src/app/stats/tags/[tagId]/TagDetailClient.tsx`
   - Same migration

5. `src/app/stats/ratings/[rating]/RatingDetailClient.tsx`
   - Same migration

6. `src/app/api/my-movies/route.ts`
   - Added POST method for mutations
   - Consolidated actions into API

### Error Handling Improvements
7. `src/app/api/person/[id]/route.ts`
   - Added timeout handling
   - Added partial data support (actor without filmography)
   - Non-critical errors don't crash page

8. `src/app/components/MovieCard.tsx`
   - Fixed CineChance rating loading
   - Added error boundaries

### Client Data Fetching
9. `src/hooks/useSearch.ts`
   - Added retry logic with exponential backoff
   - Added proper error messages

---

## Deep Reflection: Systemic Patterns

### Pattern 1: "New Feature" Blindness

**Observation:** Server Actions adopted because "it's the new Next.js feature" without understanding constraints.

**The Flaw:**
- Read blog post about Server Actions
- Thought "this is simpler than API routes"
- Used for all data fetching
- Didn't understand "server-only" constraint
- Client-side dynamic import failed

**Root Cause:** Technology adopted without reading documentation.

**Solution:**
```markdown
## Technology Adoption Checklist

Before using new feature:
- [ ] Read official documentation
- [ ] Understand constraints and limitations
- [ ] Identify use cases it solves
- [ ] Identify use cases it doesn't solve
- [ ] Test in isolation
- [ ] Document decision
```

### Pattern 2: "It Works in Development"

**Observation:** Server Actions worked locally but failed in production.

**Why:**
- Development: Single process, server action runs in same context
- Production: Edge functions, serverless, different constraints
- Dynamic import behaves differently

**Lesson:** Always test production-like environment (Vercel preview deployments).

### Pattern 3: Error Handling Anarchy

**Observation:** No consistent error handling strategy across APIs.

**The Inconsistencies Found:**
```typescript
// API 1: Throws
if (!response.ok) throw new Error('Failed');

// API 2: Returns error object
return { error: 'Failed', data: null };

// API 3: Returns null
if (!response.ok) return null;

// API 4: Crashes (no handling)
const data = await response.json(); // May throw
```

**Solution:** Standardized error response format:
```typescript
// src/lib/api-response.ts
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  };
}

export function success<T>(data: T): ApiResponse<T> {
  return { data };
}

export function error(
  message: string, 
  code: string, 
  retryable = false
): ApiResponse<never> {
  return { error: { message, code, retryable } };
}
```

### Pattern 4: Loading State Inconsistency

**Observation:** Different patterns for data loading across components.

**Patterns Found:**
1. `useState + useEffect` with conditional fetch
2. `useState + useEffect` with unconditional fetch
3. `useSWR` for caching
4. Server Actions with Suspense
5. Direct fetch in event handlers

**Solution:** Standardize on SWR/React Query:
```typescript
// src/hooks/useApi.ts
export function useApi<T>(
  key: string, 
  fetcher: () => Promise<T>,
  options?: SWRConfiguration
) {
  return useSWR(key, fetcher, {
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    ...options
  });
}

// Usage
const { data, error, isLoading } = useApi(
  `/api/user/genres`,
  () => fetch('/api/user/genres').then(r => r.json())
);
```

### Pattern 5: Critical vs Non-Critical Data

**Observation:** No distinction between "must have" and "nice to have" data.

**The Problem:**
```typescript
// All data treated as critical
const [user, genres, tags, stats] = await Promise.all([
  getUser(),      // Critical - can't proceed
  getGenres(),    // Non-critical - can proceed without
  getTags(),      // Non-critical
  getStats()      // Non-critical
]);
// If genres fail, user sees error page even though app could work
```

**Better Approach:**
```typescript
// Critical: block rendering
const user = await getUser();
if (!user) return <ErrorPage />;

// Non-critical: parallel with fallbacks
const [genres, tags, stats] = await Promise.allSettled([
  getGenres(),
  getTags(),
  getStats()
]);

const genresData = genres.status === 'fulfilled' ? genres.value : [];
// Continue rendering with partial data
```

---

## Prevention Strategies

### For Server Actions

**Usage Guidelines:**
```markdown
## Server Actions Do's and Don'ts

✅ DO:
- Use in Server Components
- Use for form submissions
- Use for mutations that need server context
- Import statically at top of file

❌ DON'T:
- Dynamic import in Client Components
- Use for simple data fetching (use API routes)
- Use for real-time updates
- Assume they work like API routes
```

### For Error Handling

**API Route Template:**
```typescript
export async function GET(req: Request) {
  try {
    // Validate input
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'ID required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }
    
    // Fetch data with timeout
    const data = await fetchWithTimeout(getData(id), 5000);
    
    return NextResponse.json(success(data));
    
  } catch (error) {
    logger.error('API error', { error, endpoint: '/api/data' });
    
    return NextResponse.json(
      error('Failed to load data', 'FETCH_ERROR', true),
      { status: 500 }
    );
  }
}
```

### For Data Loading

**Component Pattern:**
```typescript
export function DataComponent({ id }: { id: string }) {
  const { data, error, isLoading } = useApi(
    `/api/data/${id}`,
    () => fetchData(id)
  );
  
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!data) return <EmptyState />;
  
  return <DataView data={data} />;
}
```

### For Testing

**Error Scenario Tests:**
```typescript
test('handles API timeout gracefully', async () => {
  server.use(
    rest.get('/api/person/:id', (req, res, ctx) => {
      return res(ctx.delay(10000)); // Timeout
    })
  );
  
  render(<PersonPage id="123" />);
  
  await waitFor(() => {
    expect(screen.getByText(/timeout/i)).toBeVisible();
  });
});
```

---

## Verification Checklist

- [x] No dynamic Server Action imports in Client Components
- [x] All Client Components use API routes via fetch
- [x] Person API handles timeouts gracefully
- [x] CineChance rating loads on mount
- [x] Error boundaries catch API errors
- [x] Non-critical data failures don't crash page
- [x] Loading states consistent across components

---

## Related Incidents

- **Rate Limiting:** API route errors handled inconsistently (see rate-limiting-architecture-failures.md)
- **Status Display:** API response structure inconsistency (see status-display-consistency-failures.md)

---

## Final Notes

This incident reveals the complexity of modern React architecture choices. Server Actions are powerful but have clear boundaries:

1. **They're not a replacement for API routes** - different use cases
2. **Error handling must be explicit** - no implicit try-catch
3. **Data loading conditions must be carefully designed** - avoid impossible conditions

**Key Takeaway:** Choose technology based on constraints, not hype. Server Actions and API routes both have their place - the skill is knowing which to use when.

**The Rule:** If you can't explain why you're using Server Actions instead of API routes (or vice versa), you probably don't understand the trade-offs.
