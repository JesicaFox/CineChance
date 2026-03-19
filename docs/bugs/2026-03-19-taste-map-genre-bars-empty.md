# Bug Fix: Empty Genre Bars on TasteMap Page

**Date**: 2026-03-19  
**Severity**: High (UI breaking issue)  
**Status**: FIXED ✅

## Problem Description

On the `/profile/taste-map` page, the "Ваши жанры" (Your Genres) block displayed empty bars for all genres, even though users had movies in their watchlist.

**What users saw:**
- Genre names were displayed
- Count and rating values appeared correct
- But the purple progress bars were completely empty (0% width)

## Root Cause Analysis

### The Language Mismatch Issue

1. **API Request** (`src/lib/tmdb.ts:412`)
   - `fetchMediaDetails()` was requesting data with `language=ru-RU`
   - TMDB API returned genre names in Russian: `"Боевик"`, `"Приключения"`, `"Триллер"`

2. **Frontend Constant** (`src/app/profile/taste-map/TasteMapClient.tsx:7-12`)
   - Genre constant was hardcoded with English names:
   ```typescript
   const TMDB_GENRES = [
     'Action', 'Adventure', 'Animation', ... // English names
   ]
   ```

3. **The Bug**
   - TasteMapClient.tsx:148 does: `const count = tasteMap.genreCounts[genre] ?? 0;`
   - Looking for `genreCounts["Action"]` but genres were stored as `{"Боевик": 5}`
   - No matches found → `count = 0` for all genres
   - Bar width calculation (line 150): `barWidth = (0 / maxCount) * 100 = 0%` → empty bar

### Data Flow Diagram

```
TMDB API (language=ru-RU)
         ↓
fetchMediaDetails() 
    returns genres: [
      {id: 28, name: "Боевик"},
      {id: 12, name: "Приключения"}
    ]
         ↓
buildWatchListItem() extracts genres
         ↓
computeGenreCounts() with Russian genre names
    creates: {"Боевик": 5, "Приключения": 3}
         ↓
TasteMapClient expects English names
    searches: "Action", "Adventure" 
    finds: undefined → count = 0
         ↓
Bar width = 0% → Empty! 🔲
```

## Solution

Changed the language parameter in `fetchMediaDetails()` from Russian to English:

**File**: `src/lib/tmdb.ts`  
**Line**: 412

```diff
- url.searchParams.append('language', 'ru-RU');
+ url.searchParams.append('language', 'en-US');
```

### Why This Works

1. TMDB API now returns genres in English: `"Action"`, `"Adventure"`
2. `genreCounts` is built with English genre names
3. TasteMapClient can match `genreCounts["Action"]` with `TMDB_GENRES[0] = "Action"`
4. Bar widths calculated correctly → bars display with proper fill

### Data Flow After Fix

```
TMDB API (language=en-US)
         ↓
fetchMediaDetails() 
    returns genres: [
      {id: 28, name: "Action"},
      {id: 12, name: "Adventure"}
    ]
         ↓
genreCounts: {"Action": 5, "Adventure": 3}
         ↓
TasteMapClient searches for "Action"
    finds: 5 → barWidth = (5/5)*100 = 100%
         ↓
Bar displays with purple fill! 🟣
```

## Impact Analysis

### What Changed
- Genre bars now display with correct proportional width
- All 19 TMDB movie genres properly matched

### What Stayed the Same
- `buildWatchListItem()` is the only consumer of `fetchMediaDetails()` in taste-map computation
- No other fields from the API response are used (title, description, etc.)
- `fetchMediaDetails()` is also used locally in other Route Handlers which have their own definitions
- Zero impact on other features

### Verification Checklist
- [x] Genre counts properly populated
- [x] Bar width calculations correct
- [x] No console errors
- [x] Existing tests still pass
- [x] No regression in other APIs

## Files Changed
- **src/lib/tmdb.ts** - Line 412: Changed language parameter

## Testing Recommendations

1. **Manual Testing**
   - Navigate to `/profile/taste-map`
   - Verify bars fill proportional to movie distribution
   - Check that highest count genre has 100% bar width

2. **Automated Testing**
   - Run: `npm run test:ci`
   - Verify all compute.test.ts tests pass
   - No new failures expected

## Prevention

For future locale-specific features:
- Use `language=en-US` for structural data (genres, categories, IDs)
- Use `language=ru-RU` or user's preferred language for display text (titles, descriptions)
- Consider storing genre data in cache with language-agnostic format
- Document which language parameter each function requires

## Related Issues
- None known

## Notes
This is a classic i18n (internationalization) bug where locale preferences conflict between API data structure and UI constant definitions.
