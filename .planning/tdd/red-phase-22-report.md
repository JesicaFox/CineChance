# RED Phase 22 Report - My Movies UI Fixes

## Test Run Summary

**Date:** 2026-03-11  
**Command:** `npx vitest run --reporter=verbose`

---

## Failing Test Files

### 1. `.planning/phases/22-my-movies-ui-fixes/tdd/acceptance-code-22.scroll-to-top.test.tsx`

| Test Name | Status | Error |
|-----------|--------|-------|
| shows scroll-to-top button after scrolling down >300px | **FAIL** | Unable to find a label with the text of: Наверх |
| hides scroll-to-top button when scrolling back up | **FAIL** | Unable to find a label with the text of: Наверх |

### 2. `.planning/phases/22-my-movies-ui-fixes/tdd/acceptance-code-22.order-numbers.test.tsx`

| Test Name | Status | Error |
|-----------|--------|-------|
| hides order numbers when showIndex=false | **FAIL** | expected 3 to be +0 // Object.is equality |
| removes index prop from MovieCard when showIndex=false | **FAIL** | expect(element).not.toBeInTheDocument() |
| keeps order numbers hidden after changing filters | **FAIL** | expected 3 to be +0 // Object.is equality |

### 3. `.planning/tdd/spec-22.scroll-to-top.test.tsx`

| Test Name | Status | Error |
|-----------|--------|-------|
| should set showScrollTop to true when scrolled down >300px | **FAIL** | Unable to find a label with the text of: Наверх |
| should set showScrollTop to false when scrolled back up <=300px | **FAIL** | Unable to find a label with the text of: Наверх |

---

## Backward Compatibility - Existing Tests

The following existing tests continue to **PASS** (backward compatibility maintained):

- `src/app/components/__tests__/FilmGridWithFilters.orderNumbers.test.tsx` - **ALL PASS**
  - passes index prop to MovieCard components
  - displays correct sequential order numbers for multiple movies
  - MovieCards receive index prop and display order numbers
  - single movie displays order number 1
  - empty state works correctly

- `src/app/components/__tests__/MovieCard.orderNumbers.test.tsx` - **ALL PASS**
  - renders order number when index prop is provided
  - displays index + 1 as order number
  - order number has correct styling classes
  - order number is positioned above the card

---

## Key Error Messages (First 3)

1. **Error 1:** `Unable to find a label with the text of: Наверх`
   - Source: Scroll-to-top button tests
   - Cause: Button component not implemented yet

2. **Error 2:** `expected 3 to be +0 // Object.is equality`
   - Source: Order numbers showIndex=false tests
   - Cause: showIndex prop not being respected (still showing order numbers)

3. **Error 3:** `expect(element).not.toBeInTheDocument()`
   - Source: Order numbers MovieCard prop test
   - Cause: index prop still being passed when showIndex=false

---

## Failure Count

| Category | Count |
|----------|-------|
| Total Failing Tests | **7** |
| - Scroll-to-top tests | 4 |
| - Order numbers (showIndex=false) tests | 3 |

---

## Summary

**RED State Confirmed ✓**

- The new scroll-to-top button functionality is NOT implemented - tests are correctly failing
- The `showIndex` prop for hiding order numbers on My Movies page is NOT implemented - tests are correctly failing
- Existing order number tests (backward compatibility) continue to pass
- The implementation can now proceed

---

## Implementation Requirements (derived from failing tests)

1. **Scroll-to-Top Button:**
   - Add scroll event listener on mount
   - Show button when scrollY > 300px
   - Hide button when scrollY <= 300px
   - Button should have Russian label "Наверх"
   - Click should call window.scrollTo({ top: 0, behavior: 'smooth' })

2. **showIndex Prop:**
   - FilmGridWithFilters should accept optional `showIndex` prop (default: true)
   - When showIndex=false, should NOT pass index prop to MovieCard
   - When showIndex=false, MovieCard should not render order numbers
   - MyMoviesContentClient should pass showIndex=false to FilmGridWithFilters
