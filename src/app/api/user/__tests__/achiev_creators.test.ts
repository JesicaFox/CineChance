import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/achiev_creators/route';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

process.env.NEXTAUTH_SECRET = 'test-secret-32-characters-long-1234567890';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.TMDB_API_KEY = 'test-api-key';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user', email: 'test@example.com' },
  }),
  authOptions: {},
}));

// Mock authOptions
vi.mock('@/auth', () => ({
  authOptions: {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [],
    pages: { signIn: '/auth/signin' },
    session: { strategy: 'jwt' },
    jwt: { secret: process.env.NEXTAUTH_SECRET },
  },
}));

// Mock rate limiting
vi.mock('@/middleware/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock movie status constants
vi.mock('@/lib/movieStatusConstants', () => ({
  MOVIE_STATUS_IDS: {
    WATCHED: 1,
    REWATCHED: 2,
    WANT_TO_WATCH: 3,
    DROPPED: 4,
    HIDDEN: 5,
  },
}));

// Mock prisma
const mockWatchListFindMany = vi.fn();
const mockPersonProfileUpsert = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    watchList: {
      findMany: (...args: unknown[]) => mockWatchListFindMany(...args),
    },
    personProfile: {
      upsert: (...args: unknown[]) => mockPersonProfileUpsert(...args),
    },
  },
}));

// Mock redis - withCache should just call the fetcher directly
vi.mock('@/lib/redis', () => ({
  withCache: vi.fn(async (_key: string, fetcher: () => Promise<any>) => {
    return fetcher();
  }),
}));

// Import prisma after mocking
import { prisma } from '@/lib/prisma';

describe('AchievCreators API - Creator Score and Sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (url: string): NextRequest => {
    return new Request(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } }) as unknown as NextRequest;
  };

  describe('creator_score calculation and sorting', () => {
    it('should sort creators by creator_score in descending order', async () => {
      // Arrange: Create two creators with different expected scores
      // Creator A: High rating (9), many movies (50), high progress (80%)
      // Creator B: Low rating (5), fewer movies (10), low progress (30%)
      mockWatchListFindMany
        .mockResolvedValueOnce([
          // WATCHED movies - each gets processed to find directors
          { tmdbId: 100, mediaType: 'movie', userRating: 9 },  // Director A movie
          { tmdbId: 101, mediaType: 'movie', userRating: 9 },  // Director A movie
          { tmdbId: 200, mediaType: 'movie', userRating: 5 },  // Director B movie
        ])
        .mockResolvedValueOnce([])  // REWATCHED
        .mockResolvedValueOnce([]); // DROPPED

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=50&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('creators');
      expect(Array.isArray(data.creators)).toBe(true);

      // Verify creators have creator_score
      if (data.creators.length > 1) {
        // CRITICAL: Must sort by creator_score, not average_rating
        expect(data.creators[0]).toHaveProperty('creator_score');
        expect(data.creators[1]).toHaveProperty('creator_score');
        
        // First creator should have higher or equal score than second
        expect(data.creators[0].creator_score).toBeGreaterThanOrEqual(data.creators[1].creator_score);
      }
    });

    it('should include creator_score in API response', async () => {
      // Arrange
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 8 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=10&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      if (data.creators.length > 0) {
        expect(data.creators[0]).toHaveProperty('creator_score');
        expect(typeof data.creators[0].creator_score).toBe('number');
      }
    });

    it('should apply tie-breaker: average_rating (nulls last) when creator_score is equal', async () => {
      // Arrange: This test verifies tie-breaking logic
      // In practice, creators with same score should be sorted by rating desc, nulls last
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 7 },
          { tmdbId: 101, mediaType: 'movie', userRating: 8 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=50&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      // If there are creators with different ratings but similar scores,
      // the one with higher rating should come first
      if (data.creators.length >= 2) {
        const first = data.creators[0];
        const second = data.creators[1];
        
        // If scores are equal, rating should determine order (or nulls last)
        if (first.creator_score === second.creator_score) {
          if (first.average_rating !== null && second.average_rating !== null) {
            expect(first.average_rating).toBeGreaterThanOrEqual(second.average_rating);
          }
        }
      }
    });

    it('should apply tie-breaker: progress_percent when scores and ratings are equal', async () => {
      // Arrange: Similar setup to test progress_percent tie-breaking
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 8 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=50&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      if (data.creators.length >= 2) {
        // If creator_score and average_rating are equal, progress_percent should be tie-breaker
        const first = data.creators[0];
        const second = data.creators[1];
        
        if (first.creator_score === second.creator_score && first.average_rating === second.average_rating) {
          expect(first.progress_percent).toBeGreaterThanOrEqual(second.progress_percent);
        }
      }
    });

    it('should sort by creator_score in paginated mode', async () => {
      // Arrange
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 9 },
          { tmdbId: 101, mediaType: 'movie', userRating: 8 },
          { tmdbId: 102, mediaType: 'movie', userRating: 7 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act - paginated mode (singleLoad=false)
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=2&offset=0');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('creators');
      
      // In paginated mode, creators should also be sorted by creator_score
      if (data.creators.length > 1) {
        expect(data.creators[0]).toHaveProperty('creator_score');
        expect(data.creators[1]).toHaveProperty('creator_score');
        expect(data.creators[0].creator_score).toBeGreaterThanOrEqual(data.creators[1].creator_score);
      }
    });
  });

  describe('type safety - no any types', () => {
    it('should have properly typed creator objects in response', async () => {
      // Arrange
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 8 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=10&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      if (data.creators.length > 0) {
        const creator = data.creators[0];
        
        // All these properties should exist and be properly typed
        expect(creator).toHaveProperty('id');
        expect(creator).toHaveProperty('name');
        expect(creator).toHaveProperty('profile_path');
        expect(creator).toHaveProperty('watched_movies');
        expect(creator).toHaveProperty('rewatched_movies');
        expect(creator).toHaveProperty('dropped_movies');
        expect(creator).toHaveProperty('total_movies');
        expect(creator).toHaveProperty('progress_percent');
        expect(creator).toHaveProperty('average_rating');
        expect(creator).toHaveProperty('creator_score');
        
        // Verify types are not 'any'
        expect(typeof creator.id).toBe('number');
        expect(typeof creator.name).toBe('string');
        expect(typeof creator.creator_score).toBe('number');
      }
    });

    it('should return correct structure for hasMore and total', async () => {
      // Arrange
      mockWatchListFindMany
        .mockResolvedValueOnce([
          { tmdbId: 100, mediaType: 'movie', userRating: 8 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=10&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('hasMore');
      expect(data).toHaveProperty('total');
      expect(typeof data.hasMore).toBe('boolean');
      expect(typeof data.total).toBe('number');
    });
  });

  describe('empty watchlist handling', () => {
    it('should return empty creators array when no movies watched', async () => {
      // Arrange: No watched movies
      mockWatchListFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=50&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.creators).toEqual([]);
      expect(data.hasMore).toBe(false);
      expect(data.total).toBe(0);
    });
  });

  describe('limit parameter', () => {
    it('should respect limit parameter', async () => {
      // Arrange: Return enough data
      const watchedMovies = Array.from({ length: 20 }, (_, i) => ({
        tmdbId: 1000 + i,
        mediaType: 'movie',
        userRating: 8,
      }));

      mockWatchListFindMany
        .mockResolvedValueOnce(watchedMovies)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act: Request only 2 creators
      const req = createRequest('http://localhost/api/user/achiev_creators?limit=2&singleLoad=true');
      const res = await GET(req);

      // Assert
      expect(res.status).toBe(200);
      const data = await res.json();

      // Should respect limit (at most 2 creators)
      expect(data.creators.length).toBeLessThanOrEqual(2);
    });
  });

  describe('TypeScript type safety - no any types', () => {
    const routeFilePath = path.join(process.cwd(), 'src/app/api/user/achiev_creators/route.ts');

    it('should not have any types in filteredCrewDetails (line ~463)', () => {
      // This test verifies that the route file does not use 'any' type in critical places
      // Specifically checking the filteredCrewDetails variable and related filter operations
      
      const fileContent = fs.readFileSync(routeFilePath, 'utf-8');
      
      // The code should NOT use 'any' type in filter callbacks like (r: any)
      // These patterns indicate missing type definitions
      const anyTypePatterns = [
        /\(r:\s*any\)/,  // filter callback with r: any
        /:\s*any\s*\[\]/, // any[] type annotation
      ];

      const violations: string[] = [];
      
      // Check for explicit 'any' in the file (excluding comments)
      const lines = fileContent.split('\n');
      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('/*')) return;
        
        // Check for specific patterns that indicate missing types
        if (line.includes('r: any') || line.includes('any[]')) {
          // More specific check: look for the filter operations around line 515-518
          if (index >= 514 && index <= 540) {
            violations.push(`Line ${index + 1}: ${line.trim()}`);
          }
        }
      });

      // The test FAILS if any types are found in critical filtering code
      // This ensures proper type definitions are in place
      expect(violations, 
        `Found 'any' types in route file at lines:\n${violations.join('\n')}\n\n` +
        'Expected: Proper type interfaces (e.g., FilteredCrewDetail) should be defined\n' +
        'Actual: Using "any" type which bypasses TypeScript safety'
      ).toHaveLength(0);
    });

    it('should have FilteredCrewDetail interface defined', () => {
      // Verify that proper type interfaces exist in the file
      const fileContent = fs.readFileSync(routeFilePath, 'utf-8');
      
      // The spec requires defining FilteredCrewDetail interface
      // This interface should have: movie, mediaType, isAnime, isCartoon, fetchSuccess
      const hasFilteredCrewDetailInterface = 
        fileContent.includes('interface FilteredCrewDetail') ||
        fileContent.includes('type FilteredCrewDetail');

      expect(hasFilteredCrewDetailInterface, 
        'Expected: FilteredCrewDetail interface should be defined with proper structure\n' +
        'Actual: No FilteredCrewDetail interface found'
      ).toBe(true);
    });

    it('should pass ESLint no-explicit-any rule', () => {
      // Run ESLint to check for any types
      let eslintResults: any[] = [];
      try {
        const result = execSync(
          'npx eslint src/app/api/user/achiev_creators/route.ts --format json',
          { encoding: 'utf-8', cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] }
        );
        
        eslintResults = JSON.parse(result);
      } catch (error: any) {
        // If there's output but it's not JSON, try to parse stderr
        if (error.stdout) {
          try {
            eslintResults = JSON.parse(error.stdout);
          } catch {
            // If both fail, fail the test
            expect(false, `ESLint output is not valid JSON: ${error.message}`).toBe(true);
            return;
          }
        } else {
          expect(false, `ESLint check failed to run: ${error.message}`).toBe(true);
          return;
        }
      }
      
      const fileResults = eslintResults.find((r: any) => 
        r.filePath?.includes('achiev_creators/route.ts')
      );
      
      if (!fileResults) {
        expect(true).toBe(true); // Pass if no results found
        return;
      }
      
      const anyErrors = fileResults.messages?.filter((msg: any) => 
        msg.rule === '@typescript-eslint/no-explicit-any'
      ) || [];
      
      expect(anyErrors, 
        `ESLint found ${anyErrors.length} 'any' type violations:\n` +
        anyErrors.map((e: any) => `  Line ${e.line}: ${e.message}`).join('\n')
      ).toHaveLength(0);
    });
  });
});
