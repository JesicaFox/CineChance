// .planning/tdd/my-movies-pagination-limit.test.ts
// RED tests for bug: my-movies pagination limit
// Bug context: Page /my-movies shows only 100 movies and pagination stops
// Expected: Should load all user movies with infinite scroll (20 per page)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Track mock calls
let watchListCreateMock: ReturnType<typeof vi.fn>;
let watchListFindManyMock: ReturnType<typeof vi.fn>;
let watchListCountMock: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

describe('Bug: My Movies Pagination Limit', () => {
  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock Prisma methods
    watchListCreateMock = vi.fn().mockResolvedValue(undefined);
    watchListFindManyMock = vi.fn().mockResolvedValue([]);
    watchListCountMock = vi.fn().mockResolvedValue(0);

    // Mock the singleton prisma object
    const mockPrisma = {
      watchList: {
        create: watchListCreateMock,
        findMany: watchListFindManyMock,
        count: watchListCountMock,
        findUnique: vi.fn().mockResolvedValue(null),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      movieStatus: {
        findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'Просмотрено' }),
      },
    };

    vi.mock('@/lib/prisma', () => ({
      prisma: mockPrisma,
    }));

    // Mock NextAuth
    const mockSession = {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
      },
    };

    vi.mock('next-auth', () => ({
      getServerSession: vi.fn().mockResolvedValue(mockSession),
      authOptions: {},
    }));

    // Mock fetch for TMDB API
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        title: 'Test Movie',
        vote_average: 7.0,
        vote_count: 100,
        release_date: '2020-01-01',
        genre_ids: [1, 2, 3],
        original_language: 'en',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Scenario: 150 movies without TMDB filters', () => {
    it('should return 20 movies on page 1 with hasMore=true', async () => {
      // Setup: Create test user and 150 watchList records
      const testUserId = 'test-user-123';
      const tmdbIds = Array.from({ length: 150 }, (_, i) => 1000 + i);
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24), // One day apart
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        });
      });

      // Simulate finding created records
      watchListFindManyMock.mockResolvedValue(
        tmdbIds.map((tmdbId, i) => ({
          id: tmdbId,
          tmdbId,
          userId: testUserId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        }))
      );

      watchListCountMock.mockResolvedValue(150);

      // Import and call GET endpoint
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest('http://localhost/api/my-movies?status=Просмотрено&page=1&limit=20', {
        method: 'GET',
      });

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should return 20 movies on page 1
      expect(data.movies.length).toBe(20);
      expect(data.hasMore).toBe(true);
      expect(data.totalCount).toBe(150);

      // Verify correct data was fetched
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
          skip: 0,
          take: 21, // 20 + 1 for hasMore detection
        })
      );
    });

    it('should return 20 movies on page 2 with hasMore=true', async () => {
      // Setup
      const testUserId = 'test-user-123';
      const tmdbIds = Array.from({ length: 150 }, (_, i) => 1000 + i);
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        });
      });

      watchListFindManyMock.mockResolvedValue(
        tmdbIds.map((tmdbId, i) => ({
          id: tmdbId,
          tmdbId,
          userId: testUserId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        }))
      );

      watchListCountMock.mockResolvedValue(150);

      // Import and call GET endpoint with page=2
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest('http://localhost/api/my-movies?status=Просмотрено&page=2&limit=20', {
        method: 'GET',
      });

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should return 20 movies on page 2 (items 21-40)
      expect(data.movies.length).toBe(20);
      expect(data.hasMore).toBe(true);
      expect(data.totalCount).toBe(150);

      // Verify correct skip parameter
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2-1) * 20
          take: 21,
        })
      );
    });

    it('should return 20 movies on page 5 with hasMore=true (100 movies total)', async () => {
      // Setup
      const testUserId = 'test-user-123';
      const tmdbIds = Array.from({ length: 150 }, (_, i) => 1000 + i);
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        });
      });

      watchListFindManyMock.mockResolvedValue(
        tmdbIds.map((tmdbId, i) => ({
          id: tmdbId,
          tmdbId,
          userId: testUserId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        }))
      );

      watchListCountMock.mockResolvedValue(150);

      // Import and call GET endpoint with page=5
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest('http://localhost/api/my-movies?status=Просмотрено&page=5&limit=20', {
        method: 'GET',
      });

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should return 20 movies on page 5 (items 81-100)
      expect(data.movies.length).toBe(20);
      expect(data.hasMore).toBe(true);
      expect(data.totalCount).toBe(150);

      // Verify correct skip parameter
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 80, // (5-1) * 20
          take: 21,
        })
      );
    });

    // BUG TEST: This should PASS (correct behavior)
    // Currently this test will PASS because pagination is working correctly
    it('should return 20 movies on page 6 with hasMore=true (150 movies total)', async () => {
      // Setup
      const testUserId = 'test-user-123';
      const tmdbIds = Array.from({ length: 150 }, (_, i) => 1000 + i);
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        });
      });

      watchListFindManyMock.mockResolvedValue(
        tmdbIds.map((tmdbId, i) => ({
          id: tmdbId,
          tmdbId,
          userId: testUserId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        }))
      );

      watchListCountMock.mockResolvedValue(150);

      // Import and call GET endpoint with page=6
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest('http://localhost/api/my-movies?status=Просмотрено&page=6&limit=20', {
        method: 'GET',
      });

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should return 20 movies on page 6 (items 101-120)
      // BUG: Currently returns 0 movies and hasMore=false (expected 20, got 0)
      expect(data.movies.length).toBe(20); // This will FAIL with buggy behavior
      expect(data.hasMore).toBe(true); // This will FAIL with buggy behavior
      expect(data.totalCount).toBe(150);

      // Verify correct skip parameter
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100, // (6-1) * 20
          take: 21,
        })
      );
    });

    it('should return 10 movies on page 8 with hasMore=false (last page)', async () => {
      // Setup
      const testUserId = 'test-user-123';
      const tmdbIds = Array.from({ length: 150 }, (_, i) => 1000 + i);
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        });
      });

      watchListFindManyMock.mockResolvedValue(
        tmdbIds.map((tmdbId, i) => ({
          id: tmdbId,
          tmdbId,
          userId: testUserId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
          createdAt: new Date(now.getTime() - i * 1000 * 60 * 60 * 24),
        }))
      );

      watchListCountMock.mockResolvedValue(150);

      // Import and call GET endpoint with page=8
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest('http://localhost/api/my-movies?status=Просмотрено&page=8&limit=20', {
        method: 'GET',
      });

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should return 10 movies on page 8 (items 141-150)
      expect(data.movies.length).toBe(10);
      expect(data.hasMore).toBe(false); // This will FAIL with buggy behavior (should be false)
      expect(data.totalCount).toBe(150);

      // Verify correct skip parameter
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 140, // (8-1) * 20
          take: 21,
        })
      );
    });
  });

  describe('Scenario: 200 movies with TMDB filters (uses buffer strategy)', () => {
    it('should use BUFFER_SIZE=5000 when TMDB filters are active', async () => {
      // Setup with TMDB filters
      const testUserId = 'test-user-123';
      const now = new Date();

      watchListCreateMock.mockImplementation((data: any) => {
        return Promise.resolve({
          id: data.tmdbId,
          tmdbId: data.tmdbId,
          userId: data.userId,
          statusId: 1,
          mediaType: 'movie',
          title: `Movie ${data.tmdbId}`,
          voteAverage: 7.0,
          userRating: null,
          weightedRating: null,
          addedAt: new Date(now.getTime() - data.tmdbId * 1000), // Different dates
          createdAt: new Date(now.getTime() - data.tmdbId * 1000),
        });
      });

      // Return 200 records (simulating database query)
      const allRecords = Array.from({ length: 200 }, (_, i) => ({
        id: 1000 + i,
        tmdbId: 1000 + i,
        userId: testUserId,
        statusId: 1,
        mediaType: 'movie',
        title: `Movie ${1000 + i}`,
        voteAverage: 7.0,
        userRating: null,
        weightedRating: null,
        addedAt: new Date(now.getTime() - (1000 + i) * 1000),
        createdAt: new Date(now.getTime() - (1000 + i) * 1000),
      }));

      watchListFindManyMock.mockResolvedValue(allRecords);
      watchListCountMock.mockResolvedValue(200);

      // Import and call GET endpoint with TMDB filters
      const { GET } = await import('@/app/api/my-movies/route');

      const mockReq = new NextRequest(
        'http://localhost/api/my-movies?status=Просмотрено&types=movies&yearFrom=2020',
        {
          method: 'GET',
        }
      );

      const response = await GET(mockReq);
      const data = await response.json();

      // Assert: Should use buffer strategy
      expect(data.movies.length).toBe(20);
      expect(data.hasMore).toBe(true);

      // Verify BUFFER_SIZE is used (5000)
      expect(watchListFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5000, // BUFFER_SIZE
        })
      );
    });
  });
});
