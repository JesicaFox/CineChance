---
status: resolved
pattern_group: rate-limiting
original_files:
  - 2026-02-15-stats-rate-limit.md
  - 2026-02-09-image-proxy-rate-limit-cache.md
  - SEARCH_FIXES.md (rate limit component)
  - 2026-02-09-infinite-slow-loading-loop.md (rate limit component)
merged_date: 2026-02-19
severity: high
impact_apis:
  - /api/stats/*
  - /api/image-proxy
  - /api/search
  - /api/my-movies
---

# Debug Session: Rate Limiting Architecture Failures

## Summary

**Trigger:** Multiple 429 "Too Many Requests" errors across different APIs, with inconsistent behavior between endpoints.

**Root Cause Category:** Incorrect ordering of rate limiting in request lifecycle + IP-based instead of user-based limiting

**Fix Complexity:** Low (configuration changes) to Medium (architectural fixes)

---

## Initial Symptoms

1. **Stats API Rate Limit (2026-02-15)**
   - Expected: Each user has personal 100 req/min limit
   - Actual: Users behind corporate NAT hit shared limit immediately
   - Reproduction: Paginate through stats detail pages on office network

2. **Image Proxy Rate Limit (2026-02-09)**
   - Expected: Cached images don't count against limit
   - Actual: Every request counted, including cache hits
   - Reproduction: Refresh page with 20 posters → instant 429

3. **Search Rate Limit (January 2026)**
   - Expected: 300 req/min for search
   - Actual: Only 60 req/min, causing search failures
   - Reproduction: Type in search box with autocomplete

4. **Infinite Loop with Cached Errors (2026-02-09)**
   - Expected: Rate limit returns retryable error
   - Actual: JSON error cached for 24 hours, breaking all posters
   - Reproduction: Hit rate limit → all subsequent loads fail

---

## Investigation Timeline

### Phase 1: Pattern Recognition

**Evidence 1:** Found inconsistent rate limit ordering across APIs:

```typescript
// WRONG: Stats APIs
const { success } = await rateLimit(request, '/api/stats/movies-by-genre');
const session = await getServerSession(authOptions); // Too late!

// WRONG: Image Proxy
const { success } = await rateLimit(req, 'default');
const cached = await redis.get(cacheKey); // Check cache AFTER rate limit!

// CORRECT: Other APIs
const session = await getServerSession(authOptions);
const userId = session.user.id;
const { success } = await rateLimit(request, '/api/path', userId);
```

**Evidence 2:** Discovered three different rate limit configurations:
- `default`: 100 req/min (IP-based)
- `/api/search`: 60 req/min → later 150 → later 300
- `/api/image-proxy`: 500 req/min → later 1000

### Phase 2: Hypothesis Testing

**Hypothesis 1:** IP-based limiting causes NAT issues (CONFIRMED)
- Office with 50 users = 1 IP
- All 50 users share 100 req/min limit
- Individual users get blocked unfairly

**Hypothesis 2:** Rate limiting before cache check wastes quota (CONFIRMED)
- Cached images shouldn't consume rate limit
- 20 images × 3 pages = 60 requests, all counted
- Most should be cache hits

**Hypothesis 3:** Rate limit errors cached by browser (CONFIRMED)
- JSON 429 response cached with max-age=86400
- Browser never retries, shows cached error forever
- Required clearing site data to fix

### Phase 3: Architectural Analysis

**The Core Problem:** Rate limiting was designed as "one size fits all" middleware, but different endpoints have different requirements:

| Endpoint | Rate Limit Needs | Cache Relationship | User Context |
|----------|-----------------|-------------------|--------------|
| `/api/image-proxy` | High (1000/min) | Check cache FIRST | IP OK (public images) |
| `/api/stats/*` | Medium (100/min) | No cache | MUST use userId |
| `/api/search` | High (300/min) | TMDB cache 1hr | User preferred |
| `/api/my-movies` | Medium (100/min) | No cache | MUST use userId |

**The Solution Pattern:**
```typescript
// 1. Get user context FIRST (if available)
const session = await getServerSession(authOptions);
const userId = session?.user?.id;

// 2. Check cache SECOND (if applicable)
const cached = await redis.get(cacheKey);
if (cached) return cached;

// 3. Rate limit LAST (only for expensive operations)
const { success } = await rateLimit(request, endpoint, userId);
if (!success) {
  // Return UNCACHEABLE placeholder for images
  return new NextResponse(placeholderSvg, {
    headers: { 'Cache-Control': 'no-cache, no-store' }
  });
}
```

---

## Technical Deep Dive

### The IP vs UserId Decision Matrix

**When to use IP-based limiting:**
- Public endpoints (no auth required)
- Assets (images, static files)
- Login/registration (before auth)

**When to use UserId-based limiting:**
- Authenticated APIs
- User-specific data
- Write operations

**When to combine:**
- First check IP for DDoS protection
- Then check userId for quota management

### Cache-First Rate Limiting Pattern

**The Problem:**
```typescript
// WRONG: Rate limit checked for cached content
await rateLimit(req, 'default'); // Counts against limit
const cached = await redis.get(key); // Might be here!
```

**The Solution:**
```typescript
// RIGHT: Cache exempt from rate limit
const cached = await redis.get(key);
if (cached) return cached; // Fast path, no limit

// Only rate limit if we need to fetch
await rateLimit(req, 'default');
const data = await fetchFromSource();
```

**Why This Matters:**
- 90% of image requests are cache hits
- Without cache-first: 1000 req/min consumed by 10 users
- With cache-first: 1000 req/min = 100 users with 10% miss rate

### The Cached Error Trap

**The Bug:**
```typescript
// WRONG: JSON error cached for 24 hours
if (!success) {
  return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  // Browser sees: Cache-Control: public, max-age=86400 (from elsewhere)
}
```

**The Solution:**
```typescript
// RIGHT: Return valid image that's not cached
if (!success) {
  return new NextResponse(rateLimitSvg, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'image/svg+xml'
    }
  });
}
```

**Key Insight:** Rate limit responses should be:
1. **Valid content** (image/svg, not JSON) to prevent parsing errors
2. **Non-cacheable** to allow retry
3. **Visually informative** (show "rate limited" message to user)

---

## Files Changed

### Rate Limit Configuration
1. `src/middleware/rateLimit.ts`
   - Added `/api/search`: 150 → 300 req/min
   - Added `/api/image-proxy`: 500 → 1000 req/min
   - Documented userId vs IP decision logic

### Stats APIs (UserId Fix)
2. `src/app/api/stats/movies-by-genre/route.ts`
   - Moved session fetch BEFORE rate limit
   - Added userId parameter to rateLimit()

3. `src/app/api/stats/movies-by-rating/route.ts`
   - Same fix as above

4. `src/app/api/stats/movies-by-tag/route.ts`
   - Same fix as above

### Image Proxy (Cache-First Fix)
5. `src/app/api/image-proxy/route.ts`
   - Moved cache check BEFORE rate limit
   - Return SVG placeholder for rate limit (not JSON)
   - Added `no-cache` headers to error responses

### Search API (Limit Increase)
6. `src/app/api/search/route.ts`
   - Added retry logic with exponential backoff
   - Graceful degradation when TMDB fails

---

## Deep Reflection: Systemic Patterns

### Pattern 1: Security Theater Anti-Pattern

**Observation:** Rate limiting was implemented as "check at entry" without understanding data flow.

**The Flaw:**
- Developer thought: "Rate limit at API entry for security"
- Reality: Different resources need different limiting strategies
- Result: Cache hits counted against limit (waste)
- Result: Authenticated users limited by IP (unfair)

**Better Approach:**
```typescript
// Rate limit the EXPENSIVE operation, not the request
async function handler(req) {
  // Cheap checks first
  if (isCached(req)) return cache;
  if (!isAuthenticated(req)) return error;
  
  // Expensive operation - this is what we limit
  const { success } = await rateLimit(req);
  if (!success) return rateLimitResponse;
  
  return await expensiveOperation();
}
```

### Pattern 2: Configuration Sprawl

**Observation:** Rate limits defined in multiple places:
- `src/middleware/rateLimit.ts` (central config)
- Individual API files (override by calling with different parameters)
- Environment variables (sometimes)

**The Flaw:**
- No single source of truth
- Hard to tune limits (need to check 10 files)
- Inconsistent defaults

**Recommendation:**
```typescript
// Central configuration with environment overrides
// src/config/rateLimits.ts
export const RATE_LIMITS = {
  imageProxy: {
    default: 1000,
    production: parseInt(process.env.RATE_LIMIT_IMAGE_PROXY || '1000'),
    development: 10000 // Unlimited-ish for dev
  },
  stats: {
    default: 100,
    perUser: true // Always use userId
  },
  search: {
    default: 300,
    perUser: false // IP-based OK (public endpoint)
  }
};
```

### Pattern 3: Error Handling Inconsistency

**Observation:** Rate limit errors handled differently:
- Some return JSON 429
- Some return HTML error page
- Some return SVG placeholder
- Cache headers vary wildly

**The Flaw:**
- Client can't handle consistently
- Some errors cached, others not
- User experience unpredictable

**Standardized Pattern:**
```typescript
// Return type depends on Accept header
export function rateLimitResponse(req: Request) {
  const accept = req.headers.get('Accept');
  
  if (accept?.includes('image/')) {
    return svgRateLimitResponse(); // Visual feedback
  }
  
  return jsonRateLimitResponse(); // API error
}
```

### Pattern 4: Observability Gap

**Observation:** Rate limit incidents discovered through user complaints, not monitoring.

**Missing:**
- No metrics on rate limit hits
- No alerting on high 429 rates
- No visibility into which users/IPs hitting limits

**Recommendation:**
```typescript
// Add to rate limit middleware
logger.info('Rate limit check', {
  endpoint,
  identifier: userId || ip,
  remaining,
  hit: !success,
  timestamp: new Date().toISOString()
});

// Alert if >10% requests rate limited
// Alert if specific user/IP consistently hitting limits
```

---

## Prevention Strategies

### For New APIs

**Checklist:**
1. [ ] Determine if authenticated (use userId) or public (use IP)
2. [ ] Check cache BEFORE rate limit
3. [ ] Set appropriate limit based on operation cost
4. [ ] Return non-cacheable errors
5. [ ] Add metrics/logging

**Template:**
```typescript
export async function GET(req: Request) {
  // 1. Auth context
  const session = await getServerSession(authOptions);
  
  // 2. Cache check
  const cacheKey = generateCacheKey(req);
  const cached = await redis.get(cacheKey);
  if (cached) return Response.json(cached);
  
  // 3. Rate limit
  const userId = session?.user?.id;
  const { success } = await rateLimit(req, '/api/my-endpoint', userId);
  if (!success) {
    return Response.json({ error: 'Rate limited' }, { 
      status: 429,
      headers: { 'Cache-Control': 'no-cache' }
    });
  }
  
  // 4. Process
  const result = await processRequest(req);
  
  // 5. Cache result
  await redis.setex(cacheKey, 3600, result);
  
  return Response.json(result);
}
```

### For Existing APIs

**Audit Checklist:**
1. [ ] Does rate limit use userId for authenticated endpoints?
2. [ ] Is cache checked before rate limit?
3. [ ] Are errors non-cacheable?
4. [ ] Are limits documented and justified?

### For Monitoring

**Metrics to Track:**
- Rate limit hit rate by endpoint
- Top 10 IPs/users hitting limits
- Cache hit rate vs rate limit hits
- Error cache incidents

**Alerts:**
- >5% requests rate limited (normal usage)
- >20% requests rate limited (possible attack or misconfiguration)
- Specific user/IP >100 rate limit hits/hour

---

## Verification Checklist

- [x] All stats APIs use userId-based limiting
- [x] Image proxy checks cache before rate limit
- [x] Rate limit errors return no-cache headers
- [x] Image proxy returns SVG on rate limit (not JSON)
- [x] Search API limit increased to 300
- [x] Image proxy limit increased to 1000
- [x] All authenticated APIs fetch session before rate limit
- [x] Tested behind NAT (multiple users, same IP)

---

## Related Incidents

- **Pagination Issues:** Rate limits exacerbated by pagination bugs (see pagination-system-failures.md)
- **Caching Issues:** Rate limit + caching interaction caused infinite loops (see caching-architecture-reflection.md)

---

## Final Notes

Rate limiting is often implemented as a "security checkbox" without understanding the user's journey. This incident shows that:

1. **Order matters:** Cache before limit, auth before limit
2. **Context matters:** IP for public, userId for private
3. **User experience matters:** Rate limit shouldn't break UI permanently

**The hardest lesson:** Rate limiting that's too aggressive is worse than no rate limiting - it breaks legitimate users while determined attackers find workarounds.

**Recommendation:** Start with generous limits, monitor actual usage, then tighten based on data. Don't guess.
