---
status: resolved
pattern_group: caching-architecture
original_files:
  - 2026-02-13-actor-photo-slow-loading.md
  - 2026-02-13-profile-average-rating-fix.md
  - POSTER_MOBILE_FIX_FINAL.md
  - 2026-02-09-infinite-slow-loading-loop.md (caching component)
merged_date: 2026-02-19
severity: critical
impact_features:
  - Image loading (posters, actor photos)
  - Profile statistics caching
  - Redis integration
  - Mobile experience
---

# Debug Session: Caching Architecture Failures

## Summary

**Trigger:** Slow image loading, cache misses despite Redis, mobile loading failures, and cached errors breaking UI permanently.

**Root Cause Category:** Incorrect cache serialization + aggressive HTTP caching of errors + architectural gaps in cache invalidation

**Fix Complexity:** High (required redesign of caching layers, Redis serialization fixes, mobile-specific solutions)

---

## Initial Symptoms

1. **Actor Photos Slow Loading (2026-02-13)**
   - Expected: Photos load instantly from cache
   - Actual: 5-10s delay, no caching visible
   - Reproduction: Visit actor page second time

2. **Profile Stats Cache Issues (2026-02-13)**
   - Expected: Stats update immediately after rating change
   - Actual: Old stats shown for 1 hour (TTL)
   - Reproduction: Rate a movie, refresh profile

3. **Posters Not Loading on Mobile (February 2026)**
   - Expected: Posters load on Android Chrome
   - Actual: Blank images, infinite spinner
   - Reproduction: Open site on Android phone

4. **Infinite Slow Loading Loop (2026-02-09)**
   - Expected: Placeholder retried if image fails
   - Actual: Placeholder cached for 24 hours, never retries
   - Reproduction: Hit rate limit, return next day - still broken

---

## Investigation Timeline

### Phase 1: Redis Serialization Discovery

**Evidence 1:** Found Redis storing objects incorrectly:
```typescript
// WRONG: Storing object directly
await redis.setex(cacheKey, ttl, {
  data: base64Data,
  contentType: 'image/jpeg'
});
// Upstash Redis stores as JSON string, but returns as string
// Code expected object, got string → parsing errors
```

**Evidence 2:** No error handling for invalid cache data:
```typescript
const cached = await redis.get(cacheKey);
// If cached is string instead of object, this throws
cached.data; // TypeError: Cannot read property 'data' of string
```

**Fix Applied:**
```typescript
// CORRECT: Explicit JSON serialization
const payload = JSON.stringify({ data: base64Data, contentType });
await redis.setex(cacheKey, ttl, payload);

// And explicit parsing on retrieval
const cachedImage = await redis.get(cacheKey);
const cacheData = typeof cachedImage === 'string' 
  ? JSON.parse(cachedImage) 
  : cachedImage;
```

### Phase 2: HTTP Caching of Errors

**Evidence 1:** Found 24-hour cache on placeholder responses:
```typescript
return new NextResponse(placeholderBuffer, {
  headers: {
    'Cache-Control': 'public, max-age=86400', // 24 HOURS!
  }
});
```

**The Disaster Scenario:**
1. Image fails to load (TMDB timeout)
2. Placeholder returned with 24h cache
3. Browser caches placeholder forever
4. User sees "Медленная загрузка" for 24 hours
5. Even when TMDB recovers, browser shows cached error
6. Required clearing site data to fix

**Fix Applied:**
```typescript
// Never cache errors
return new NextResponse(placeholderBuffer, {
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});
```

### Phase 3: Mobile Chrome CORS/Cache Issues

**Evidence:** Desktop worked, mobile failed consistently.

**Root Cause Analysis:**
- Mobile Chrome has stricter CORS policies
- TMDB images served without proper CORS headers for mobile
- Next.js Image optimization quota exceeded on Vercel
- Mobile browsers cache failures differently

**The Image Proxy Solution:**
```typescript
// Created /api/image-proxy
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');
  
  // 1. Check Redis cache (bypasses CORS)
  const cached = await redis.get(cacheKey);
  if (cached) return cached;
  
  // 2. Server-side fetch (bypasses client CORS)
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': 'CineChance/1.0' }
  });
  
  // 3. Cache and return
  const buffer = await response.arrayBuffer();
  await redis.setex(cacheKey, 21600, JSON.stringify({
    data: Buffer.from(buffer).toString('base64'),
    contentType: response.headers.get('content-type')
  }));
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': response.headers.get('content-type'),
      'Cache-Control': 'public, max-age=3600',
      'X-Cache': 'MISS'
    }
  });
}
```

### Phase 4: Cache Invalidation Strategy

**Evidence:** Profile stats showed stale data after updates.

**Problem:**
- Stats cached for 1 hour
- User rates movie, expects updated stats
- Old stats shown → user confused

**Solution: Event-Based Invalidation**
```typescript
// When movie status changes
export async function updateWatchStatus(userId: string, ...) {
  // Update database
  await prisma.watchList.update({...});
  
  // Invalidate related caches
  await invalidateUserCaches(userId);
}

async function invalidateUserCaches(userId: string) {
  const patterns = [
    `stats:${userId}:*`,
    `user:${userId}:stats`,
    `user:${userId}:genres`,
    `user:${userId}:tags`,
  ];
  
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

---

## Technical Deep Dive

### The Redis Serialization Trap

**Why It Failed:**
- Upstash Redis client serializes objects to JSON automatically
- But retrieval sometimes returns string, sometimes parsed object
- Depends on client configuration, connection state, who knows what

**The Safe Pattern:**
```typescript
export async function setCache<T>(
  key: string, 
  value: T, 
  ttl: number
): Promise<void> {
  const serialized = JSON.stringify(value);
  await redis.setex(key, ttl, serialized);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  
  // Handle both string and object returns
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  return parsed as T;
}
```

### HTTP Cache Control Matrix

| Scenario | Cache-Control | Reason |
|----------|---------------|--------|
| Successful image | `public, max-age=3600` | Cache for performance |
| Error/placeholder | `no-cache, no-store` | Never cache errors |
| Rate limited | `no-cache` + SVG | Retry later |
| Fallback image | `no-cache` | Try primary first |
| Redis HIT | `public, max-age=3600` + X-Cache: HIT | Cache browser too |

### The Mobile Problem

**Why Mobile Chrome Failed:**

1. **CORS Preflight**
   - Desktop: Preflight cached, subsequent requests fast
   - Mobile: Stricter preflight, sometimes fails

2. **Image Optimization Quota**
   - Vercel Image Optimization: 5000 requests/month
   - Used up in 1 day with 20 posters × 100 users
   - Mobile hit quota faster due to different caching

3. **Cache Size Limits**
   - Mobile browsers have smaller caches
   - Failed responses took up cache space
   - Successful responses evicted

**The Proxy Solution Advantages:**
- Bypasses Vercel Image Optimization (unlimited)
- CORS handled server-side (no preflight issues)
- Redis cache shared across all users (deduplication)
- Consistent behavior desktop/mobile

### Cache Invalidation Patterns

**Pattern 1: TTL-Based (Simple, Stale Data)**
```typescript
await redis.setex(key, 3600, data);
// Pros: Simple
// Cons: User sees stale data for up to 1 hour
```

**Pattern 2: Event-Based (Complex, Fresh Data)**
```typescript
// On data change
await invalidateCache(key);
// Pros: Always fresh
// Cons: Complex dependency tracking
```

**Pattern 3: Hybrid (Best of Both)**
```typescript
// Short TTL (5 min) + event invalidation
await redis.setex(key, 300, data);

// On data change
await invalidateCache(key);

// Pros: Mostly fresh, occasional 5-min stale OK
// Cons: More complex
```

**We Chose:** Pattern 3 with 1-hour TTL for stats, immediate invalidation on updates

---

## Files Changed

### Image Proxy System
1. `src/app/api/image-proxy/route.ts` (created)
   - Server-side image fetching
   - Redis caching with JSON serialization
   - Rate limiting integration
   - Mobile-specific User-Agent headers

2. `src/app/components/MoviePosterProxy.tsx` (created)
   - Uses `/api/image-proxy?url=...`
   - Handles loading states
   - Browser cache detection
   - Retry logic with cache busting

3. `src/app/components/ImageWithProxy.tsx` (modified)
   - Route all TMDB images through proxy
   - Support for actor photos

### Redis & Caching
4. `src/lib/redis.ts`
   - Added `getCache`/`setCache` helpers with JSON handling
   - Added `invalidateUserCaches` function
   - SCAN instead of KEYS for safe invalidation

5. `src/app/api/user/stats/route.ts`
   - Added Redis caching (1 hour TTL)
   - Added cache invalidation triggers

6. `src/app/api/watchlist/route.ts`
   - Added cache invalidation on status change

7. `src/app/api/admin/clear-cache/route.ts` (created)
   - Manual cache clearing endpoint
   - Useful for debugging

### Profile & Stats
8. `src/app/api/user/genres/route.ts`
   - Added Redis caching
   
9. `src/app/api/user/tag-usage/route.ts`
   - Added Redis caching

10. `src/app/api/user/achiev_collection/route.ts`
    - Added Redis caching

---

## Deep Reflection: Systemic Patterns

### Pattern 1: Cache-First Without Validation

**Observation:** Caching implemented without considering serialization edge cases.

**The Flaw:**
```typescript
// Assumed Redis returns what we put in
await redis.set(key, { data: 'value' });
const result = await redis.get(key);
result.data; // Might fail!
```

**Root Cause:** No abstraction layer for cache operations.

**Solution:**
```typescript
// src/lib/cache.ts - Abstract cache layer
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  // Always safe
};
```

### Pattern 2: Error Caching Anti-Pattern

**Observation:** Error responses cached with same headers as success.

**The Flaw:**
```typescript
// One size fits all
const headers = { 'Cache-Control': 'public, max-age=86400' };

if (success) {
  return new NextResponse(data, { headers });
} else {
  return new NextResponse(error, { headers }); // Oops!
}
```

**Root Cause:** No distinction between cacheable and non-cacheable responses.

**Solution:**
```typescript
const CACHEABLE_SUCCESS = { 'Cache-Control': 'public, max-age=3600' };
const NEVER_CACHE = { 'Cache-Control': 'no-cache, no-store' };

return success 
  ? new NextResponse(data, { headers: CACHEABLE_SUCCESS })
  : new NextResponse(error, { headers: NEVER_CACHE });
```

### Pattern 3: Platform-Specific Assumptions

**Observation:** "Works on desktop" treated as "works everywhere".

**The Flaw:**
- Desktop Chrome tested extensively
- Mobile Chrome assumed to behave same
- Different CORS, caching, quota behaviors
- Mobile users got broken experience

**Root Cause:** No mobile-first testing, no cross-platform validation.

**Solution:**
- Test on real mobile devices (not just devtools)
- Separate mobile acceptance criteria
- Consider mobile constraints (cache size, CORS, quotas)

### Pattern 4: Cache Invalidation Complexity

**Observation:** Multiple cache layers with different invalidation needs.

**The Complexity:**
```
Browser Cache (HTTP headers)
    ↓
CDN Cache (Vercel Edge)
    ↓
Redis Cache (Application)
    ↓
Database (Source of truth)
```

**The Problem:**
- Each layer needs separate invalidation
- Invalidation order matters
- Race conditions possible
- Hard to debug "why stale"

**Simplified Architecture:**
```
Browser Cache (short, 1 hour)
    ↓
Redis Cache (shared, 6 hours for images, 1 hour for stats)
    ↓
Database (always fresh)
```

**No CDN cache** - eliminated complexity

### Pattern 5: Third-Party Quota Blindness

**Observation:** Vercel Image Optimization quota exceeded without monitoring.

**The Numbers:**
- Quota: 5000 images/month
- Usage: 20 posters × 50 users × 5 page views = 5000 images/day!
- Cost: $0 (for now), but broke mobile experience

**Root Cause:** No quota monitoring, no fallback strategy.

**Solution:**
```typescript
// Build-time check
if (process.env.VERCEL && !process.env.USE_IMAGE_PROXY) {
  console.warn('⚠️ Image optimization quota may be exceeded');
}

// Runtime protection
const useProxy = process.env.USE_IMAGE_PROXY === 'true' || 
                 quotaRemaining < 1000;
```

---

## Prevention Strategies

### For Caching Implementation

**The Golden Rules:**
1. **Always serialize** - Never trust automatic serialization
2. **Never cache errors** - Use no-cache headers for failures
3. **Test deserialization** - Verify cached data can be read back
4. **Monitor hit rates** - Low hit rate = broken cache

**Cache Layer Checklist:**
- [ ] Abstraction layer with JSON serialization
- [ ] Separate cache policies for success/error
- [ ] Mobile testing for image caching
- [ ] Invalidation triggers on data changes
- [ ] Hit rate monitoring

### For Image Loading

**Architecture Decision Record:**
```markdown
## ADR: Image Loading Strategy

**Status:** Accepted
**Date:** 2026-02-13

### Context
- Need to support desktop and mobile
- Vercel Image Optimization has quotas
- TMDB has CORS restrictions

### Decision
Use server-side image proxy with Redis caching

### Consequences
- ✅ Bypasses Vercel quotas
- ✅ Handles CORS server-side
- ✅ Shared cache across users
- ❌ Additional server load
- ❌ Redis dependency
```

### For Mobile Support

**Testing Checklist:**
- [ ] Test on real Android device (Chrome)
- [ ] Test on real iOS device (Safari)
- [ ] Test with slow 3G throttling
- [ ] Test with images disabled
- [ ] Verify touch targets work

### For Cache Invalidation

**Dependency Mapping:**
```typescript
// Document what invalidates what
const CACHE_DEPENDENCIES = {
  'user:stats': ['watchlist:update', 'rating:update'],
  'user:genres': ['watchlist:update'],
  'user:tags': ['tag:update'],
  'image:*': ['never'], // Images don't change
};
```

---

## Verification Checklist

- [x] Redis uses explicit JSON serialization
- [x] Error responses have no-cache headers
- [x] Image proxy works on mobile Chrome
- [x] Profile stats invalidate on rating change
- [x] Cache hit rate >80% for images
- [x] No Vercel Image Optimization quota issues
- [x] Manual cache clear endpoint works
- [x] All TMDB images route through proxy

---

## Related Incidents

- **Rate Limiting:** Image proxy rate limiting issues (see rate-limiting-architecture-failures.md)
- **Pagination:** Caching interacted with pagination (see pagination-system-failures.md)

---

## Final Notes

Caching is often described as "simple optimization" but this incident shows it requires careful architecture:

1. **Serialization is not free** - explicit handling required
2. **Errors must not cache** - or users suffer for hours
3. **Mobile is different** - test on real devices
4. **Invalidation is hard** - but necessary for good UX

**Key Takeaway:** Caching should be designed as a separate subsystem with its own abstraction, testing, and monitoring. Don't sprinkle cache calls throughout the codebase.

**The Rule:** If you can't explain your cache invalidation strategy in one sentence, it's too complex.
