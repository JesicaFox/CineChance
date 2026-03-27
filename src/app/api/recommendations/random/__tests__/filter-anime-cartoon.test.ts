import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { fetchMediaDetails } from '@/lib/tmdb';
import { NextRequest } from 'next/server';

vi.mock('@/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    watchList: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    recommendationSettings: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    recommendationLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    ratingHistory: {
      count: vi.fn(),
    },
  },
}));
vi.mock('@/lib/tmdb', () => ({
  fetchMediaDetails: vi.fn(),
}));
vi.mock('@/middleware/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;
const mockPrisma = prisma as any;
const mockFetchMediaDetails = fetchMediaDetails as ReturnType<typeof vi.fn>;

describe('GET /api/recommendations/random - Anime/Cartoon Filter Bug', () => {
  const mockSession = { user: { id: 'test-user-id' } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    
    // Mock user with birth date for adult filter
    mockPrisma.user.findUnique.mockResolvedValue({
      birthDate: new Date('1990-01-01'),
    });
    
    // Mock empty recommendation settings
    mockPrisma.recommendationSettings.findUnique.mockResolvedValue({
      preferHighRating: true,
      minRating: 5.0,
    });
    
    // Mock no recent recommendations (no cooldown)
    mockPrisma.recommendationLog.findMany.mockResolvedValue([]);
  });

  it('should return anime items when types=anime is requested', async () => {
    // Arrange: User has anime items in watchlist
    const watchListItems = [
      {
        id: '1',
        tmdbId: 100,
        mediaType: 'movie', // TMDB returns movie type but content is anime
        title: 'Naruto',
        voteAverage: 8.0,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
      {
        id: '2',
        tmdbId: 200,
        mediaType: 'movie',
        title: 'Regular Movie',
        voteAverage: 7.0,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
    ];
    mockPrisma.watchList.findMany.mockResolvedValue(watchListItems);

    // Mock TMDB details - item 100 is anime (Japanese animation)
    const animeDetails = {
      id: 100,
      title: 'Naruto',
      adult: false,
      original_language: 'ja', // Japanese
      genre_ids: [16], // Animation genre
      release_date: '2002-09-21',
      vote_average: 8.0,
      vote_count: 1000,
    };
    
    const regularMovieDetails = {
      id: 200,
      title: 'Regular Movie',
      adult: false,
      original_language: 'en',
      genre_ids: [28], // Action
      release_date: '2020-01-01',
      vote_average: 7.0,
      vote_count: 500,
    };

    mockFetchMediaDetails
      .mockResolvedValueOnce(animeDetails) // First batch call
      .mockResolvedValueOnce(regularMovieDetails) // Second batch call
      .mockResolvedValueOnce(animeDetails); // Third call for tmdbData

    // Mock rating history count
    mockPrisma.ratingHistory.count.mockResolvedValue(0);

    // Mock recommendation log creation
    mockPrisma.recommendationLog.create.mockResolvedValue({ id: 'log-1' });

    // Act: Request with types=anime
    const request = new NextRequest('http://localhost:3000/api/recommendations/random?types=anime&lists=want');
    const response = await GET(request);
    const data = await response.json();

    // Assert: Should return anime content
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.movie).not.toBeNull();
    
    // This is the bug - currently returns regular movie instead of anime
    // Expected: media_type should be 'anime' or isAnime should be true
    // Actual: returns movie/tv
    expect(data.movie.media_type).toBe('anime'); // This will FAIL - returns 'movie'
  });

  it('should return cartoon items when types=cartoon is requested', async () => {
    // Arrange: User has cartoon items in watchlist
    const watchListItems = [
      {
        id: '1',
        tmdbId: 300,
        mediaType: 'movie',
        title: 'Cartoon Movie',
        voteAverage: 7.5,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
      {
        id: '2',
        tmdbId: 400,
        mediaType: 'movie',
        title: 'Regular Hollywood Movie',
        voteAverage: 7.0,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
    ];
    mockPrisma.watchList.findMany.mockResolvedValue(watchListItems);

    // Mock TMDB details - item 300 is cartoon (non-Japanese animation)
    const cartoonDetails = {
      id: 300,
      title: 'Cartoon Movie',
      adult: false,
      original_language: 'en', // English - NOT Japanese = cartoon
      genre_ids: [16], // Animation
      release_date: '2010-01-01',
      vote_average: 7.5,
      vote_count: 800,
    };

    const regularMovieDetails = {
      id: 400,
      title: 'Regular Hollywood Movie',
      adult: false,
      original_language: 'en',
      genre_ids: [28],
      release_date: '2020-01-01',
      vote_average: 7.0,
      vote_count: 500,
    };

    mockFetchMediaDetails
      .mockResolvedValueOnce(cartoonDetails) // First batch call
      .mockResolvedValueOnce(regularMovieDetails) // Second batch call
      .mockResolvedValueOnce(cartoonDetails); // Third call for tmdbData

    mockPrisma.ratingHistory.count.mockResolvedValue(0);
    mockPrisma.recommendationLog.create.mockResolvedValue({ id: 'log-1' });

    // Act: Request with types=cartoon
    const request = new NextRequest('http://localhost:3000/api/recommendations/random?types=cartoon&lists=want');
    const response = await GET(request);
    const data = await response.json();

    // Assert: Should return cartoon content
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.movie).not.toBeNull();
    
    // This is the bug - currently returns regular movie instead of cartoon
    expect(data.movie.media_type).toBe('cartoon'); // This will FAIL - returns 'movie'
  });

  it('should return both anime and cartoon when types=anime,cartoon is requested', async () => {
    // Arrange: User has both anime and cartoon items in watchlist
    const watchListItems = [
      {
        id: '1',
        tmdbId: 100,
        mediaType: 'movie',
        title: 'Anime Movie',
        voteAverage: 8.0,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
      {
        id: '2',
        tmdbId: 300,
        mediaType: 'movie',
        title: 'Cartoon Movie',
        voteAverage: 7.5,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
      {
        id: '3',
        tmdbId: 400,
        mediaType: 'movie',
        title: 'Regular Movie',
        voteAverage: 7.0,
        addedAt: new Date(),
        userRating: null,
        statusId: 1,
      },
    ];
    mockPrisma.watchList.findMany.mockResolvedValue(watchListItems);

    const animeDetails = {
      id: 100,
      title: 'Anime Movie',
      adult: false,
      original_language: 'ja',
      genre_ids: [16],
      release_date: '2002-09-21',
      vote_average: 8.0,
      vote_count: 1000,
    };

    const cartoonDetails = {
      id: 300,
      title: 'Cartoon Movie',
      adult: false,
      original_language: 'en', // Non-Japanese = cartoon
      genre_ids: [16],
      release_date: '2010-01-01',
      vote_average: 7.5,
      vote_count: 800,
    };

    const regularMovieDetails = {
      id: 400,
      title: 'Regular Movie',
      adult: false,
      original_language: 'en',
      genre_ids: [28],
      release_date: '2020-01-01',
      vote_average: 7.0,
      vote_count: 500,
    };

    mockFetchMediaDetails
      .mockResolvedValueOnce(animeDetails)
      .mockResolvedValueOnce(cartoonDetails)
      .mockResolvedValueOnce(regularMovieDetails)
      .mockResolvedValueOnce(animeDetails); // Fourth call for tmdbData

    mockPrisma.ratingHistory.count.mockResolvedValue(0);
    mockPrisma.recommendationLog.create.mockResolvedValue({ id: 'log-1' });

    // Act: Request with types=anime,cartoon
    const request = new NextRequest('http://localhost:3000/api/recommendations/random?types=anime,cartoon&lists=want');
    const response = await GET(request);
    const data = await response.json();

    // Assert: Should return either anime or cartoon (not regular movie)
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.movie).not.toBeNull();
    
    // The returned item should be either anime or cartoon, NOT regular movie
    const isAnime = data.movie.media_type === 'anime';
    const isCartoon = data.movie.media_type === 'cartoon';
    const isRegularMovie = data.movie.media_type === 'movie';
    
    // This is the bug - currently might return regular movie
    expect(isAnime || isCartoon).toBe(true);
    expect(isRegularMovie).toBe(false); // This will FAIL - might return 'movie'
  });
});