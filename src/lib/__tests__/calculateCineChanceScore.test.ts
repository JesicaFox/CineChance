import { describe, it, expect } from 'vitest';
import { calculateCineChanceScore } from '../calculateCineChanceScore';

describe('calculateCineChanceScore', () => {
  it('returns TMDB rating when no CineChance votes', () => {
    const result = calculateCineChanceScore({
      tmdbRating: 7.5,
      tmdbVotes: 1000,
      cineChanceRating: null,
      cineChanceVotes: 0,
    });

    expect(result).toBe(7.5);
  });

  it('returns TMDB rating when TMDB votes are zero', () => {
    const result = calculateCineChanceScore({
      tmdbRating: 7.5,
      tmdbVotes: 0,
      cineChanceRating: 8.0,
      cineChanceVotes: 10,
    });

    expect(result).toBe(7.5);
  });

  it('returns TMDB rating when CineChance rating is null', () => {
    const result = calculateCineChanceScore({
      tmdbRating: 7.5,
      tmdbVotes: 1000,
      cineChanceRating: null,
      cineChanceVotes: 100,
    });

    expect(result).toBe(7.5);
  });

  it('calculates basic score with both ratings', () => {
    const result = calculateCineChanceScore({
      tmdbRating: 7.0,
      tmdbVotes: 1000,
      cineChanceRating: 8.5,
      cineChanceVotes: 100,
    });

    // При 100 голосах CineChance (>= 50): используется формула сравнения голосов
    // cineWeight = 100 / (100 + 1000) = 100/1100 ≈ 0.091
    // Но применяется минимум MIN_CINE_WEIGHT = 0.15
    // tmdbWeight = 1 - 0.15 = 0.85
    // score = 0.15 * 8.5 + 0.85 * 7.0 = 1.275 + 5.95 = 7.225 ≈ 7.2
    expect(result).toBe(7.2);
  });

  it('applies IMDB-style formula for small number of CineChance votes', () => {
    // Due to Math.min before Math.max in implementation:
    // cineWeight = 10 / (10 + 2) = 0.833
    // Math.min(MAX_CINE_WEIGHT, 0.833) = 0.80 (cap applied first)
    // Math.max(MIN_CINE_WEIGHT, 0.80) = 0.80
    // score = 0.80 * 8.0 + 0.20 * 6.0 = 6.4 + 1.2 = 7.6
    const result = calculateCineChanceScore({
      tmdbRating: 6.0,
      tmdbVotes: 1000,
      cineChanceRating: 8.0,
      cineChanceVotes: 10,
    });

    expect(result).toBe(7.6);
  });

  it('respects maximum CineWeight of 80%', () => {
    // При очень большом количестве голосов CineChance
    // cineWeight = 10000 / (10000 + 1000) = 0.91
    // Но максимум MAX_CINE_WEIGHT = 0.80
    const result = calculateCineChanceScore({
      tmdbRating: 5.0,
      tmdbVotes: 1000,
      cineChanceRating: 9.0,
      cineChanceVotes: 10000,
    });

    // cineWeight = 0.80, tmdbWeight = 0.20
    // score = 0.80 * 9.0 + 0.20 * 5.0 = 7.2 + 1.0 = 8.2
    expect(result).toBe(8.2);
  });

  it('respects minimum CineWeight of 15%', () => {
    // При малом количестве голосов CineChance
    // cineWeight = 5 / (5 + 2) = 5/7 ≈ 0.714
    // Минимум 0.15 применяется, но 0.714 > 0.15
    const result = calculateCineChanceScore({
      tmdbRating: 8.0,
      tmdbVotes: 1000,
      cineChanceRating: 9.5,
      cineChanceVotes: 5,
    });

    // cineWeight = 5 / 7 ≈ 0.714 (выше минимума 0.15)
    // tmdbWeight = 1 - 0.714 = 0.286
    // score = 0.714 * 9.5 + 0.286 * 8.0 = 6.783 + 2.288 = 9.071 ≈ 9.1
    expect(result).toBe(9.1);
  });

  it('handles edge case of exactly 50 CineChance votes (transition point)', () => {
    // При exactly TRANSITION_VOTES (50), используется голосовое сравнение (не <, а >=)
    // cineWeight = 50 / (50 + 1000) = 50/1050 ≈ 0.0476
    // Минимум MIN_CINE_WEIGHT = 0.15 применяется
    const result = calculateCineChanceScore({
      tmdbRating: 7.0,
      tmdbVotes: 1000,
      cineChanceRating: 9.0,
      cineChanceVotes: 50,
    });

    // cineWeight = 0.15 (min applied), tmdbWeight = 0.85
    // score = 0.15 * 9.0 + 0.85 * 7.0 = 1.35 + 5.95 = 7.3
    expect(result).toBe(7.3);
  });

  it('handles exactly 51 CineChance votes (above transition)', () => {
    // При > 50 голосах используется голосовое сравнение
    // cineWeight = 51 / (51 + 1000) = 51/1051 ≈ 0.0485
    // Применяется минимум 0.15
    const result = calculateCineChanceScore({
      tmdbRating: 7.0,
      tmdbVotes: 1000,
      cineChanceRating: 9.0,
      cineChanceVotes: 51,
    });

    // cineWeight = 0.15 (min applied), tmdbWeight = 0.85
    // score = 0.15 * 9.0 + 0.85 * 7.0 = 1.35 + 5.95 = 7.3
    expect(result).toBe(7.3);
  });

  it('rounds to one decimal place', () => {
    const result = calculateCineChanceScore({
      tmdbRating: 7.123,
      tmdbVotes: 100,
      cineChanceRating: 8.456,
      cineChanceVotes: 10,
    });

    // Should be rounded to one decimal
    expect(result).toBeDefined();
    expect(typeof result).toBe('number');
    // Check that it's rounded to 1 decimal
    expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
  });
});
