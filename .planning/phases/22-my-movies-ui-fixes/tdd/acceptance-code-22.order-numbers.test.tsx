import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import FilmGridWithFilters from '@/app/components/FilmGridWithFilters';
import { Media } from '@/lib/tmdb';

// Mock IntersectionObserver for infinite scroll
beforeEach(() => {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit
    ) {}
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }

  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

// Mock child components
vi.mock('@/app/components/MoviePosterProxy', () => ({
  default: ({ movie }: { movie: Media }) => (
    <div data-testid="movie-poster-proxy">{movie.title}</div>
  ),
}));

vi.mock('@/app/components/StatusOverlay', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="status-overlay">{status}</div>
  ),
}));

vi.mock('@/app/components/RatingModal', () => ({
  default: ({ isOpen, onClose, title }: any) =>
    isOpen ? <div data-testid="rating-modal">{title}</div> : null,
}));

vi.mock('@/app/components/RatingInfoModal', () => ({
  default: ({ isOpen, onClose, title }: any) =>
    isOpen ? <div data-testid="rating-info-modal">{title}</div> : null,
}));

vi.mock('@/app/components/BlacklistContext', () => ({
  useBlacklist: () => ({
    checkBlacklist: vi.fn(() => false),
    isLoading: false,
  }),
}));

describe('FilmGridWithFilters - Order Numbers (showIndex prop)', () => {
  const mockMovies: Media[] = [
    {
      id: 1,
      title: 'Movie 1',
      vote_average: 7.5,
      vote_count: 1000,
      media_type: 'movie',
      overview: 'Overview 1',
      poster_path: '/1.jpg',
    },
    {
      id: 2,
      title: 'Movie 2',
      vote_average: 8.0,
      vote_count: 2000,
      media_type: 'tv',
      overview: 'Overview 2',
      poster_path: '/2.jpg',
    },
    {
      id: 3,
      title: 'Movie 3',
      vote_average: 6.5,
      vote_count: 500,
      media_type: 'movie',
      overview: 'Overview 3',
      poster_path: '/3.jpg',
    },
  ];

  const mockFetchMovies = vi.fn().mockResolvedValue({
    movies: mockMovies,
    hasMore: false,
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Backward Compatibility (showIndex=true by default)', () => {
    it('displays order numbers when showIndex is not specified (default true)', async () => {
      render(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Movie [1-3]/).length).toBeGreaterThan(0);
      });

      // Order numbers 1, 2, 3 should be visible (default behavior)
      const orderNumbers = screen.getAllByText(/^[1-3]$/);
      expect(orderNumbers.length).toBe(3);
    });

    it('explicitly shows order numbers when showIndex=true', async () => {
      render(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
          showIndex={true}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Movie [1-3]/).length).toBeGreaterThan(0);
      });

      const orderNumbers = screen.getAllByText(/^[1-3]$/);
      expect(orderNumbers.length).toBe(3);
    });
  });

  describe('My Movies page (showIndex=false)', () => {
    it('hides order numbers when showIndex=false', async () => {
      render(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
          showIndex={false}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Movie [1-3]/).length).toBeGreaterThan(0);
      });

      // Order numbers should NOT be visible
      const orderNumbers = screen.queryAllByText(/^[1-3]$/);
      expect(orderNumbers.length).toBe(0);
    });

    it('removes index prop from MovieCard when showIndex=false', async () => {
      // This test will check that MovieCard doesn't receive index prop
      // We can verify by checking that order numbers don't appear in the document
      render(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
          showIndex={false}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Movie [1-3]/).length).toBeGreaterThan(0);
      });

      // No standalone numbers 1, 2, 3 should be in document
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('keeps order numbers hidden after changing filters', async () => {
      // Simulate filtering (which would normally cause a re-fetch)
      // Since showIndex=false is a prop, it should remain hidden across re-renders
      const { rerender } = render(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
          showIndex={false}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Movie [1-3]/).length).toBeGreaterThan(0);
      });

      // Verify numbers are hidden
      expect(screen.queryAllByText(/^[1-3]$/).length).toBe(0);

      // Simulate a prop change (like filters changing) but keep showIndex=false
      rerender(
        <FilmGridWithFilters
          fetchMovies={mockFetchMovies}
          initialLoading={false}
          showIndex={false}
        />
      );

      // Order numbers should still be hidden
      expect(screen.queryAllByText(/^[1-3]$/).length).toBe(0);
    });
  });
});
