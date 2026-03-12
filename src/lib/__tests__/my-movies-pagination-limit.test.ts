import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/my-movies/route';

process.env.NEXTAUTH_SECRET = 'test-secret-32-characters-long-1234567890';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.TMDB_API_KEY = 'test';

const prismaCalls: Array<{ method: string; args: any[] }> = [];

const mockRecords = Array.from({ length: 150 }, (_, i) => ({
  id: i + 1,
  tmdbId: 1000 + i,
  mediaType: 'movie' as const,
  title: `Movie ${i + 1}`,
  voteAverage: 7,
  vote_count: 1000,
  userRating: null,
  weightedRating: null,
  addedAt: new Date(Date.now() - i * 1000 * 60 * 60 * 24), // Date object
  statusId: 1,
  tags: [],
}));

const mockTMDBData = (tmdbId: number) => ({
  title: `Movie ${tmdbId - 1000 + 1}`,
  name: `Movie ${tmdbId - 1000 + 1}`,
  poster_path: `/poster${tmdbId}.jpg`,
  vote_average: 7.5,
  vote_count: 1000,
  release_date: '2024-01-01',
  first_air_date: '2024-01-01',
  overview: 'Test movie',
  genre_ids: [],
  original_language: 'en',
});

vi.mock('@/middleware/rateLimit', () => ({ rateLimit: vi.fn().mockResolvedValue({ success: true }) }));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user', email: 'test@example.com' },
  }),
  authOptions: {},
}));

vi.mock('@/auth', () => ({
  authOptions: {
    secret: process.env.NEXTAUTH_SECRET,
    providers: [],
    pages: { signIn: '/auth/signin' },
    session: { strategy: 'jwt' },
    jwt: { secret: process.env.NEXTAUTH_SECRET },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    watchList: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    blacklist: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Vi.mock logger removed to see errors

vi.mock('@/lib/movieStatusConstants', () => ({
  MOVIE_STATUS_IDS: { WATCHED: 1, REWATCHED: 2, WANT_TO_WATCH: 3, DROPPED: 4, HIDDEN: 5 },
  getStatusIdByName: vi.fn((name: string) => {
    const map: Record<string, number> = { 'Просмотрено': 1, 'Пересмотрено': 2, 'Хочу посмотреть': 3, 'Брошено': 4, 'Скрытые': 5 };
    return map[name] || null;
  }),
  getStatusNameById: vi.fn((id: number) => ['Unknown', 'Просмотрено', 'Пересмотрено', 'Хочу посмотреть', 'Брошено', 'Скрытые'][id] || 'Unknown'),
}));

vi.mock('@/lib/calculateCineChanceScore', () => ({
  calculateCineChanceScore: vi.fn(() => 7.5),
}));

vi.mock('@/lib/recommendation-outcome-tracking', () => ({
  trackOutcome: vi.fn(),
}));

import { prisma } from '@/lib/prisma';

describe('My Movies Pagination (no TMDB filters)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaCalls.length = 0;
    (prisma.watchList.groupBy as any).mockResolvedValue([]);
    (prisma.watchList.count as any).mockResolvedValue(150);
    (prisma.watchList.findMany as any).mockImplementation(async (args: any) => {
      prismaCalls.push({ method: 'findMany', args: [args] });
      const { skip = 0, take = 20 } = args;
      return mockRecords.slice(skip, skip + take);
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTMDBData(1000)),
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (url: string): NextRequest => {
    return new Request(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } }) as unknown as NextRequest;
  };

  it('uses skip/take for page 2 without TMDB filters', async () => {
    const req = createRequest('http://localhost/api/my-movies?page=2&limit=20&statusName=Просмотрено');
    const res = await GET(req);
    if (res.status !== 200) {
      const err = await res.text();
      console.error('Error response:', res.status, err);
    }
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.movies).toHaveLength(20);
    expect(data.hasMore).toBe(true);

    const call = prismaCalls.find(c => c.method === 'findMany')!;
    const args = call.args[0] as any;
    expect(args).toHaveProperty('skip', 20);
    expect(args).toHaveProperty('take', 21);
    expect(data.movies[0].id).toBe(1000 + 20);
  });

  it('loads all 150 movies across pages', async () => {
    const all: any[] = [];
    for (let p = 1; p <= 8; p++) {
      const req = createRequest(`http://localhost/api/my-movies?page=${p}&limit=20&statusName=Просмотрено`);
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      all.push(...data.movies);
    }
    expect(all).toHaveLength(150);
    expect(new Set(all.map(m => m.id)).size).toBe(150);
  });
});
