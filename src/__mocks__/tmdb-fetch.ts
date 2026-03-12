// Mock fetch for TMDB API calls in tests
import { vi } from 'vitest';

// Store mock data in module scope
const mockMovieCreditsMap = new Map<number, any>();
const mockMediaDetailsMap = new Map<number, any>();
let mockPersonCredits: any = null;

export const setupMockFetch = () => {
  return vi.fn(async (inputUrl: string | Request) => {
    const url = typeof inputUrl === 'string' ? inputUrl : inputUrl.url;
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);

      if (parts.length < 3) return { ok: false };
      const id = parseInt(parts[2]);

      // Movie/TV credits: /{mediaType}/{id}/credits
      if (parts[parts.length - 1] === 'credits') {
        const credits = mockMovieCreditsMap.get(id);
        if (credits) return { ok: true, json: async () => credits };
        return { ok: false };
      }

      // Person combined_credits: /person/{id}/combined_credits
      if (parts[1] === 'person' && parts[parts.length - 1] === 'combined_credits') {
        if (mockPersonCredits) {
          return { ok: true, json: async () => mockPersonCredits };
        }
        return { ok: false };
      }

      // Movie/TV details: /{mediaType}/{id}
      if ((parts[1] === 'movie' || parts[1] === 'tv') && parts.length === 3) {
        const details = mockMediaDetailsMap.get(id);
        if (details) return { ok: true, json: async () => details };
        return { ok: false };
      }
    } catch (e) {}
    return { ok: false };
  });
};

export const setMockMovieCredits = (map: Map<number, any>) => {
  Object.assign(mockMovieCreditsMap, map);
};

export const setMockMediaDetails = (map: Map<number, any>) => {
  Object.assign(mockMediaDetailsMap, map);
};

export const setMockPersonCredits = (data: any) => {
  mockPersonCredits = data;
};

export const clearMockData = () => {
  mockMovieCreditsMap.clear();
  mockMediaDetailsMap.clear();
  mockPersonCredits = null;
};
