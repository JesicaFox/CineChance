import { logger } from '@/lib/logger';

// Simple in-memory cache for TMDB data
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class TMDBCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of entries

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Remove oldest entries if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Get cache statistics
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Could be implemented with hit/miss counters
    };
  }
}

// Global cache instance
const tmdbCache = new TMDBCache();

// Clean up expired entries every 10 minutes
setInterval(() => {
  tmdbCache.cleanup();
}, 10 * 60 * 1000);

export function getCachedMediaDetails(tmdbId: number, mediaType: string): any | null {
  if (!mediaType) return null;
  const key = `${mediaType}:${tmdbId}`;
  return tmdbCache.get(key);
}

export function setCachedMediaDetails(tmdbId: number, mediaType: string, data: any): void {
  if (!mediaType) return;
  const key = `${mediaType}:${tmdbId}`;
  // Cache for 30 minutes since TMDB data doesn't change frequently
  tmdbCache.set(key, data, 30 * 60 * 1000);
}

export function clearTMDBCache(): void {
  tmdbCache.clear();
  logger.info('TMDB cache cleared');
}
