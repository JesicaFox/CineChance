# Phase 2: Error Handling - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Add error boundaries and graceful degradation so users see clear error messages instead of broken UI. Expand existing AsyncErrorBoundary, add error boundaries to critical UI sections, create custom error pages (404, 500), and implement TMDB fallback with caching.

</domain>

<decisions>
## Implementation Decisions

### Error message style
- Include error codes for debugging
- Manual dismiss required (no auto-dismiss)
- Appear near the failed component (not top of viewport)
- User-friendly but with error codes

### Error boundary scope
- All major components need error boundaries (not just critical sections)
- Component isolation: show error state for that component only
- Consistent styling across all error boundaries
- Auto-log errors to console/service
- Extend existing AsyncErrorBoundary (don't create new)
- No automatic retry - manual refresh only
- Component-specific error messages
- Include component name in error messages

### TMDB fallback behavior
- Show cached data when available (24-hour cache)
- If no cache, show placeholder + "unavailable" message
- No indication to user that cached data is shown (seamless)
- Silent fallback (auto-fallback without showing errors)
- Cache all successful TMDB responses
- Store cache in-memory (not Redis)
- Strict fresh: only serve cached data when fresh (no stale-while-revalidate)

### Error page design
- Custom themed error pages (not Next.js default)
- Minimal design (not themed illustrations)
- Include both Home link and Go Back button
- Show technical error details (for developers)

### Claude's Discretion
- Exact color scheme for error messages
- Positioning of error messages near components
- Loading skeleton design for error boundaries
- Exact styling of custom error pages

</decisions>

<specifics>
## Specific Ideas

- TMDB fallback already exists - extend and verify it works
- AsyncErrorBoundary already exists - extend it
- Use Suspense fallback for components

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 02-error-handling*
*Context gathered: 2026-02-17*
