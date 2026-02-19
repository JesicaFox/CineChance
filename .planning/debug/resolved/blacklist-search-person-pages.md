---
status: resolved
trigger: "На странице поиска и на странице фильмографии (актера или режиссера) не работает функционал добавления В черный список"
created: 2026-02-19T16:00:00.000Z
updated: 2026-02-19T16:30:00.000Z
---

## Summary

**Root Cause:** Missing `BlacklistProvider` context wrapper on Search page, causing `MovieCard` to use default context values where `isLoading` is always `true`.

**Why this broke blacklist:**
- `MovieCard` uses `useBlacklist()` hook to check blacklist status
- The hook has an effect that initializes `isBlacklisted` state when context loads
- Effect condition: `if (!isBlacklistLoading && initialIsBlacklisted === undefined)`
- Without `BlacklistProvider`, default `isLoading: true` prevents effect from ever running
- `isBlacklisted` state stays at default `false`, blacklist toggle doesn't work

## Technical Details

### BlacklistContext Default Values
```typescript
const BlacklistContext = createContext<BlacklistContextType>({
  blacklistedIds: new Set(),
  isLoading: true,  // ← Always true without Provider!
  checkBlacklist: () => false,
});
```

### MovieCard Initialization Effect
```typescript
useEffect(() => {
  if (!isBlacklistLoading && initialIsBlacklisted === undefined) {
    setIsBlacklisted(checkBlacklist(movie.id));
  }
}, [isBlacklistLoading, checkBlacklist, movie.id, initialIsBlacklisted]);
```

### The Fix

**Search page (src/app/search/SearchClient.tsx):**
```typescript
// Added import
import { BlacklistProvider } from '@/app/components/BlacklistContext';

// Wrapped MovieList with Provider
<BlacklistProvider>
  <MovieList
    movies={searchQuery.results as Media[]}
    batchData={batchDataRef.current}
    // ...other props
  />
</BlacklistProvider>
```

**Person page (src/app/person/[id]/PersonClient.tsx):**
Already had `BlacklistProvider` wrapper, but was missing `initialIsBlacklisted` prop:
```typescript
// Added to WatchlistStatus interface
interface WatchlistStatus {
  status: MediaStatus;
  userRating: number | null;
  isBlacklisted: boolean;  // ← Added
}

// Extract from API response
setWatchlistStatus({
  status: movieData.status,
  userRating: movieData.userRating,
  isBlacklisted: movieData.isBlacklisted || false,  // ← Added
});

// Pass to MovieCard
<MovieCard
  movie={movie}
  initialStatus={watchlistStatus?.status}
  initialUserRating={watchlistStatus?.userRating}
  initialIsBlacklisted={watchlistStatus?.isBlacklisted}  // ← Added
/>
```

## Why It Worked on Other Pages

**My Movies page:** Uses `BlacklistProvider` and passes `initialIsBlacklisted` correctly.

## Files Changed

1. `src/app/search/SearchClient.tsx` - Added `BlacklistProvider` wrapper around `MovieList`
2. `src/app/person/[id]/PersonClient.tsx` - Added missing `initialIsBlacklisted` prop handling

## Verification

- [x] Blacklist toggle works on Search page
- [x] Blacklist toggle works on Person filmography pages
- [x] Blacklist toggle works on My Movies page (regression test)
- [x] Build passes without errors
- [x] No console errors

## Related

Pattern: Missing Context Provider causing default value issues.
