import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MyMoviesContentClient from '@/app/my-movies/MyMoviesContentClient';

// Mock fetch globally
global.fetch = vi.fn();

// Mock FilmGridWithFilters to isolate MyMoviesContentClient tests
vi.mock('@/app/components/FilmGridWithFilters', () => ({
  default: ({ showIndex }: { showIndex?: boolean }) => (
    <div data-testid="film-grid" data-showindex={showIndex}>
      FilmGridWithFilters (showIndex={String(showIndex)})
    </div>
  ),
}));

// Mock RatingModal
vi.mock('../components/RatingModal', () => ({
  default: ({ isOpen, onClose, title }: any) =>
    isOpen ? <div data-testid="rating-modal">{title}</div> : null,
}));

// Mock BlacklistContext
vi.mock('../components/BlacklistContext', () => ({
  BlacklistProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useBlacklist: () => ({
    blacklistedIds: [],
    isLoading: false,
    checkBlacklist: vi.fn(() => false),
  }),
}));

describe('MyMoviesContentClient - Scroll-to-Top Button', () => {
  const mockUserId = 'test-user-123';
  const mockInitialCounts = {
    watched: 10,
    wantToWatch: 5,
    dropped: 2,
    hidden: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for genres and tags
    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/user/genres') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ genres: [{ id: 28, name: 'Action' }] }),
        });
      }
      if (url === '/api/user/tag-usage') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tags: [] }),
        });
      }
      return Promise.reject(new Error('Unknown fetch URL'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should render without showing scroll-to-top button initially', () => {
      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      // Initially scrollY is 0, so button should not be visible
      expect(screen.queryByLabelText(/наверх/i)).not.toBeInTheDocument();
    });

    it('should have FilmGridWithFilters with showIndex=false initially', () => {
      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      const filmGrid = screen.getByTestId('film-grid');
      expect(filmGrid.getAttribute('data-showindex')).toBe('false');
    });

    it('should render FilmGridWithFilters component', () => {
      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      expect(screen.getByTestId('film-grid')).toBeInTheDocument();
    });
  });

  describe('Scroll Event Handling', () => {
    it('should add scroll event listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('should remove scroll event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('should set showScrollTop to true when scrolled down >300px', () => {
      // Mock initial scrollY
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      // Simulate scroll down >300px
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });
      fireEvent.scroll(window);

      expect(screen.getByLabelText(/наверх/i)).toBeInTheDocument();
    });

    it('should set showScrollTop to false when scrolled back up <=300px', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      // Initially, button should appear after scroll >300
      // (We need to trigger scroll initially)
      fireEvent.scroll(window);
      expect(screen.getByLabelText(/наверх/i)).toBeInTheDocument();

      // Now scroll back up
      Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
      fireEvent.scroll(window);

      expect(screen.queryByLabelText(/наверх/i)).not.toBeInTheDocument();
    });

    it('should handle scroll at exactly 300px threshold', () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      // At 300px, button should appear (threshold is >300? Our code: >300)
      Object.defineProperty(window, 'scrollY', { value: 300, writable: true });
      fireEvent.scroll(window);

      // At exactly 300, condition is scrollY > 300 → false
      expect(screen.queryByLabelText(/наверх/i)).not.toBeInTheDocument();

      // At 301, should appear
      Object.defineProperty(window, 'scrollY', { value: 301, writable: true });
      fireEvent.scroll(window);

      expect(screen.getByLabelText(/наверх/i)).toBeInTheDocument();
    });
  });

  describe('Scroll-to-Top Button Rendering', () => {
    it('should render button with correct classes when visible', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);

      const button = screen.getByLabelText(/наверх/i);
      expect(button).toHaveClass('fixed');
      expect(button).toHaveClass('bottom-6');
      expect(button).toHaveClass('right-6');
      expect(button).toHaveClass('w-12');
      expect(button).toHaveClass('h-12');
      expect(button).toHaveClass('rounded-full');
      expect(button).toHaveClass('bg-blue-600');
      expect(button).toHaveClass('text-white');
      expect(button).toHaveClass('z-50');
      expect(button).toHaveClass('shadow-lg');
      expect(button).toHaveClass('hover:bg-blue-700');
      expect(button).toHaveClass('transition-colors');
    });

    it('should contain SVG arrow-up icon', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);

      const button = screen.getByLabelText(/наверх/i);
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();

      // Check for the specific arrow-up path
      const path = svg?.querySelector('path');
      expect(path).toHaveAttribute('d', 'M5 10l7-7m0 0l7 7m-7-7v18');
    });

    it('should have aria-label for accessibility', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);

      const button = screen.getByRole('button', { name: /наверх/i });
      expect(button).toBeInTheDocument();
    });

    it('should call window.scrollTo with smooth behavior on click', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      // Mock scrollTo
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);

      const button = screen.getByLabelText(/наверх/i);
      fireEvent.click(button);

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });
  });

  describe('FilmGridWithFilters Integration', () => {
    it('should pass showIndex=false to FilmGridWithFilters', () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      const filmGrid = screen.getByTestId('film-grid');
      expect(filmGrid.getAttribute('data-showindex')).toBe('false');
    });

    it('should keep showIndex=false even after scrolling', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);

      const filmGrid = screen.getByTestId('film-grid');
      // FilmGridWithFilters should still receive showIndex=false regardless of scroll state
      expect(filmGrid.getAttribute('data-showindex')).toBe('false');
    });
  });

  describe('Return to Top After Click', () => {
    it('button should still be visible immediately after click (during smooth scroll)', () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);
      const button = screen.getByLabelText(/наверх/i);

      fireEvent.click(button);

      // Button should still be visible right after click (scroll hasn't happened yet)
      expect(button).toBeInTheDocument();
    });

    it('button should disappear when scrollY becomes <300', async () => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      fireEvent.scroll(window);
      expect(screen.getByLabelText(/наверх/i)).toBeInTheDocument();

      // Simulate scroll completion (user clicks, smooth scroll completes)
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
      fireEvent.scroll(window);

      expect(screen.queryByLabelText(/наверх/i)).not.toBeInTheDocument();
    });
  });

  describe('No Scrollable Content Edge Case', () => {
    it('should not show button if page content is too short to scroll', () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      render(
        <MyMoviesContentClient
          userId={mockUserId}
          initialCounts={mockInitialCounts}
        />
      );

      // Even if we trigger scroll event, if scrollY never exceeds 300, button stays hidden
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
      fireEvent.scroll(window);

      expect(screen.queryByLabelText(/наверх/i)).not.toBeInTheDocument();
    });
  });
});
