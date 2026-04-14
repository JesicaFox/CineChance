/**
 * Shared Constants for Recommendation Algorithms
 * 
 * Centralized constants used across all recommendation algorithms
 * to ensure consistency and DRY principle.
 */

// Algorithm configuration defaults
export const ALGORITHM_CONFIG = {
  /** Default minimum user history for algorithm execution */
  DEFAULT_MIN_USER_HISTORY: 5,
  
  /** Default number of similar users to consider */
  DEFAULT_MAX_SIMILAR_USERS: 20,
  
  /** Default candidates to fetch per user */
  DEFAULT_TOP_MOVIES_PER_USER: 10,
  
  /** Default recommendations to return */
  DEFAULT_MAX_RECOMMENDATIONS: 12,
  
  /** Similarity threshold for matching users */
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  
  /** Minimum genre score to be considered dominant */
  DEFAULT_DOMINANT_GENRE_THRESHOLD: 50,
  
  /** Minimum person score to be considered favorite */
  DEFAULT_PERSON_SCORE_THRESHOLD: 60,
  
  /** Maximum number of dominant genres to use */
  DEFAULT_TOP_DOMINANT_GENRES: 3,
} as const;

// Score weights for all recommendation algorithms
// All weights should sum to 1.0
export const SCORE_WEIGHTS = {
  /** Taste Match (Pattern 1) */
  TASTE_MATCH: {
    similarity: 0.5,
    rating: 0.3,
    cooccurrence: 0.2,
  },
  
  /** Person-based recommendations (Pattern 8) */
  PERSON_RECOMMENDATIONS: {
    personMatch: 0.4,
    rating: 0.4,
    userSimilarity: 0.2,
  },
  
  /** Genre-based recommendations (Pattern 6) */
  GENRE_RECOMMENDATIONS: {
    genreMatchScore: 0.4,
    rating: 0.4,
    userSimilarity: 0.2,
  },
} as const;

// Weight configuration types
export type TasteMatchWeights = typeof SCORE_WEIGHTS.TASTE_MATCH;
export type PersonRecommendationWeights = typeof SCORE_WEIGHTS.PERSON_RECOMMENDATIONS;
export type GenreRecommendationWeights = typeof SCORE_WEIGHTS.GENRE_RECOMMENDATIONS;

/**
 * Get normalized weights for scoring formula
 * Ensures weights are valid (positive numbers that sum to reasonable value)
 */
export function getNormalizedWeights(
  weights: { similarity?: number; rating?: number; cooccurrence?: number }
): { similarity: number; rating: number; cooccurrence: number } {
  return {
    similarity: weights.similarity ?? SCORE_WEIGHTS.TASTE_MATCH.similarity,
    rating: weights.rating ?? SCORE_WEIGHTS.TASTE_MATCH.rating,
    cooccurrence: weights.cooccurrence ?? SCORE_WEIGHTS.TASTE_MATCH.cooccurrence,
  };
}