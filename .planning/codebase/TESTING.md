# Testing

## Test Framework

- **Vitest** - Testing framework (v1.6.1)
- **Environment**: Node.js
- **Configuration**: `vitest.config.ts`

## Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/lib/__tests__/**/*.test.ts']
  }
});
```

## Test Structure

### Location
- Tests located in `src/lib/__tests__/`
- Pattern: `*.test.ts`

### Current Tests
- `src/lib/__tests__/fetchWithRetry.test.ts` - Tests retry logic

## Test Patterns

### Example Test Structure
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries on failure and succeeds', async () => {
    // Test implementation
  });
});
```

## Running Tests

### Commands
```bash
npm run test:ci         # Run all tests (CI mode)
npx vitest run          # Run all tests
npx vitest run <file>   # Run single test file
npx vitest              # Run tests in watch mode
```

## Mocking

### MSW (Mock Service Worker)
- **Version**: ^2.0.0
- **Purpose**: API mocking for integration tests
- **Status**: Configured but limited usage

### Test Utilities
- `vi` from vitest for mocking
- Fake timers for time-sensitive tests
- Global fetch stubbing with `vi.stubGlobal`

## Coverage

- No explicit coverage configuration
- Manual testing used extensively
- Integration tests via manual verification

## Known Testing Gaps

- Limited unit test coverage
- Most testing done manually
- No E2E tests (Playwright/Cypress)
- API routes tested manually or via integration

## Best Practices (From AGENTS.md)

### Server Components with Suspense
```typescript
import { Suspense } from 'react';
import LoaderSkeleton from '@/app/components/LoaderSkeleton';

async function DataLoader({ userId }: { userId: string }) {
  const data = await fetchData(userId);
  return <Display data={data} />;
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <div>Unauthorized</div>;

  return (
    <Suspense fallback={<LoaderSkeleton variant="full" text="Loading..." />}>
      <DataLoader userId={session.user.id} />
    </Suspense>
  );
}
```

### Testing Approach
- Unit tests for utilities (`fetchWithRetry`, `calculateWeightedRating`)
- Integration tests for API routes (manual)
- E2E testing not implemented
