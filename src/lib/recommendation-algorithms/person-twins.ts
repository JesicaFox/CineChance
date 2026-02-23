/**
 * Person Twins Algorithm (Pattern 7)
 * 
 * Recommends movies based on shared favorite actors and directors.
 * Finds users with similar person preferences (actors + directors overlap)
 * and recommends their highly-rated watched movies.
 * 
 * Person overlap: Jaccard similarity on actors + directors combined
 * Score formula: (personSimilarity * 0.5) + (rating * 0.3) + (cooccurrence * 0.2)
 */

import type {
  IRecommendationAlgorithm,
  RecommendationContext,
  RecommendationSession,
  RecommendationResult,
  RecommendationItem,
  CandidateMovie,
} from './interface';
import { normalizeScores, DEFAULT_COOLDOWN } from './interface';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getPersonProfile } from '@/lib/taste-map/redis';
import { personOverlap, getSimilarUsers } from '@/lib/taste-map/similarity';
import { subDays } from 'date-fns';

// Algorithm configuration
const ALGORITHM_NAME = 'person_twins_v1';
const MIN_USER_HISTORY = 10;
const PERSON_SIMILARITY_THRESHOLD = 0.5;
const MAX_PERSON_TWINS = 15;
const TOP_MOVIES_PER_TWIN = 10;
const MAX_RECOMMENDATIONS = 12;

// Score weights
const WEIGHTS = {
  personSimilarity: 0.5,
  rating: 0.3,
  cooccurrence: 0.2,
};

/**
 * Person Twins recommendation algorithm
 * 
 * This algorithm finds users who share favorite actors and directors,
 * then recommends their highly-rated watched movies.
 */
export const personTwins: IRecommendationAlgorithm = {
  name: ALGORITHM_NAME,
  minUserHistory: MIN_USER_HISTORY,

  async execute(
    userId: string,
    context: RecommendationContext,
    sessionData: RecommendationSession
  ): Promise<RecommendationResult> {
    const startTime = Date.now();

    try {
      // 1. Check user's watched movie count
      const watchedStatusIds = await getWatchedStatusIds();
      const watchedCount = await prisma.watchList.count({
        where: {
          userId,
          statusId: { in: watchedStatusIds },
        },
      });

      // Cold start: not enough history
      if (watchedCount < MIN_USER_HISTORY) {
        logger.info('Person Twins: cold start user', {
          userId,
          watchedCount,
          minRequired: MIN_USER_HISTORY,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: 0,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      // 2. Get user's person profile (actors + directors)
      const userPersonProfile = await getPersonProfile(userId);

      if (!userPersonProfile) {
        logger.info('Person Twins: no person profile', {
          userId,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: 0,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      // Check if user has any favorite persons
      const hasActors = Object.values(userPersonProfile.actors).some(score => score > 0);
      const hasDirectors = Object.values(userPersonProfile.directors).some(score => score > 0);

      if (!hasActors && !hasDirectors) {
        logger.info('Person Twins: no favorite persons found', {
          userId,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: 0,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      // 3. Find users with similar person preferences
      const personTwins = await findPersonTwins(userId, userPersonProfile);

      if (personTwins.length === 0) {
        logger.info('Person Twins: no person twins found', {
          userId,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: 0,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      // 4. Fetch top-rated watched movies from person twins
      const candidateMovies = await fetchCandidateMovies(personTwins, userId);

      if (candidateMovies.length === 0) {
        logger.info('Person Twins: no candidate movies', {
          userId,
          personTwinsCount: personTwins.length,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: 0,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      const initialPoolSize = candidateMovies.length;

      // 5. Calculate scores for each candidate
      const scoredCandidates = calculateCandidateScores(candidateMovies, personTwins);

      // 6. Apply cooldown filter (7 days)
      const cooldownDate = subDays(new Date(), DEFAULT_COOLDOWN.days);
      const recentRecommendations = await prisma.recommendationLog.findMany({
        where: {
          userId,
          shownAt: { gte: cooldownDate },
        },
        select: { tmdbId: true, mediaType: true },
      });

      const excludedKeys = new Set(
        recentRecommendations.map(r => `${r.tmdbId}_${r.mediaType}`)
      );

      // Also exclude items user already has in their watchlist
      const userExistingItems = await prisma.watchList.findMany({
        where: { userId },
        select: { tmdbId: true, mediaType: true },
      });

      const existingKeys = new Set(
        userExistingItems.map(item => `${item.tmdbId}_${item.mediaType}`)
      );

      // Filter candidates
      const filteredCandidates = scoredCandidates.filter(candidate => {
        const key = `${candidate.tmdbId}_${candidate.mediaType}`;
        return (
          !excludedKeys.has(key) &&
          !existingKeys.has(key) &&
          !sessionData.previousRecommendations.has(key)
        );
      });

      const afterFilters = filteredCandidates.length;

      if (filteredCandidates.length === 0) {
        logger.info('Person Twins: all candidates filtered', {
          userId,
          initialPoolSize,
          excludedCount: excludedKeys.size,
          existingCount: existingKeys.size,
          context: 'PersonTwins',
        });
        return {
          recommendations: [],
          metrics: {
            candidatesPoolSize: initialPoolSize,
            afterFilters: 0,
            avgScore: 0,
          },
        };
      }

      // 7. Normalize scores to 0-100
      const normalizedCandidates = normalizeScores(filteredCandidates);

      // 8. Sort by score descending and take top N
      const topCandidates = normalizedCandidates
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RECOMMENDATIONS);

      // 9. Build final recommendations
      const recommendations: RecommendationItem[] = topCandidates.map(candidate => ({
        tmdbId: candidate.tmdbId,
        mediaType: candidate.mediaType,
        title: candidate.title,
        score: candidate.score,
        algorithm: ALGORITHM_NAME,
        sources: candidate.sourceUserIds.slice(0, 3), // Include top 3 sources
      }));

      const avgScore = recommendations.length > 0
        ? recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length
        : 0;

      const duration = Date.now() - startTime;
      logger.info('Person Twins: recommendations generated', {
        userId,
        recommendationsCount: recommendations.length,
        initialPoolSize,
        afterFilters,
        avgScore: avgScore.toFixed(1),
        personTwinsCount: personTwins.length,
        durationMs: duration,
        context: 'PersonTwins',
      });

      return {
        recommendations,
        metrics: {
          candidatesPoolSize: initialPoolSize,
          afterFilters,
          avgScore,
        },
      };
    } catch (error) {
      logger.error('Person Twins: execution error', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        context: 'PersonTwins',
      });
      
      return {
        recommendations: [],
        metrics: {
          candidatesPoolSize: 0,
          afterFilters: 0,
          avgScore: 0,
        },
      };
    }
  },
};

/**
 * Person twin with their similarity score
 */
interface PersonTwin {
  userId: string;
  personSimilarity: number;
}

/**
 * Find users with similar person preferences (actors + directors)
 */
async function findPersonTwins(
  userId: string,
  userPersonProfile: { actors: Record<string, number>; directors: Record<string, number> }
): Promise<PersonTwin[]> {
  // Get all other users
  const allUserIds = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: { id: true },
  });

  const candidateIds = allUserIds.map(u => u.id);
  const personTwins: PersonTwin[] = [];

  // Compute person overlap for each candidate
  for (const candidateId of candidateIds) {
    try {
      const candidateProfile = await getPersonProfile(candidateId);

      if (!candidateProfile) continue;

      // Calculate Jaccard similarity for actors
      const actorsOverlap = personOverlap(
        userPersonProfile.actors,
        candidateProfile.actors
      );

      // Calculate Jaccard similarity for directors
      const directorsOverlap = personOverlap(
        userPersonProfile.directors,
        candidateProfile.directors
      );

      // Combine actor and director overlap (average)
      const combinedSimilarity = (actorsOverlap + directorsOverlap) / 2;

      if (combinedSimilarity >= PERSON_SIMILARITY_THRESHOLD) {
        personTwins.push({
          userId: candidateId,
          personSimilarity: combinedSimilarity,
        });
      }
    } catch {
      // Skip users with errors
    }
  }

  // Sort by similarity (highest first) and limit
  return personTwins
    .sort((a, b) => b.personSimilarity - a.personSimilarity)
    .slice(0, MAX_PERSON_TWINS);
}

/**
 * Fetch top-rated watched movies from person twins
 */
async function fetchCandidateMovies(
  personTwins: PersonTwin[],
  excludeUserId: string
): Promise<CandidateMovie[]> {
  const watchedStatusIds = await getWatchedStatusIds();
  const movieMap = new Map<string, CandidateMovie>();

  for (const twin of personTwins) {
    // Get top rated movies from this twin (rating >= 7)
    const userMovies = await prisma.watchList.findMany({
      where: {
        userId: twin.userId,
        statusId: { in: watchedStatusIds },
        userRating: { gte: 7 }, // High rating threshold
      },
      select: {
        tmdbId: true,
        mediaType: true,
        title: true,
        userRating: true,
        voteAverage: true,
      },
      orderBy: [
        { userRating: 'desc' },
        { voteAverage: 'desc' },
      ],
      take: TOP_MOVIES_PER_TWIN,
    });

    for (const movie of userMovies) {
      const key = `${movie.tmdbId}_${movie.mediaType}`;
      
      const existing = movieMap.get(key);
      if (existing) {
        // Update existing entry
        existing.cooccurrenceCount += 1;
        existing.sourceUserIds.push(twin.userId);
        // Update similarity score to average
        const totalSimilarity = existing.similarityScore * (existing.cooccurrenceCount - 1) + twin.personSimilarity;
        existing.similarityScore = totalSimilarity / existing.cooccurrenceCount;
      } else {
        // Create new entry
        movieMap.set(key, {
          tmdbId: movie.tmdbId,
          mediaType: movie.mediaType,
          title: movie.title || `Movie ${movie.tmdbId}`,
          userRating: movie.userRating,
          voteAverage: movie.voteAverage || 0,
          similarityScore: twin.personSimilarity,
          cooccurrenceCount: 1,
          sourceUserIds: [twin.userId],
        });
      }
    }
  }

  return Array.from(movieMap.values());
}

/**
 * Calculate weighted scores for candidates
 */
function calculateCandidateScores(
  candidates: CandidateMovie[],
  personTwins: PersonTwin[]
): (CandidateMovie & { score: number })[] {
  const maxCooccurrence = Math.max(...candidates.map(c => c.cooccurrenceCount), 1);

  return candidates.map(candidate => {
    // Normalize components
    const personSimNorm = candidate.similarityScore; // Already 0-1
    const ratingNorm = (candidate.userRating ?? candidate.voteAverage / 2) / 10; // 0-1 scale
    const cooccurrenceNorm = candidate.cooccurrenceCount / maxCooccurrence; // 0-1 relative

    // Weighted sum
    const rawScore =
      personSimNorm * WEIGHTS.personSimilarity +
      ratingNorm * WEIGHTS.rating +
      cooccurrenceNorm * WEIGHTS.cooccurrence;

    return {
      ...candidate,
      score: rawScore,
    };
  });
}

/**
 * Get status IDs for watched content
 */
async function getWatchedStatusIds(): Promise<number[]> {
  const statuses = await prisma.movieStatus.findMany({
    where: {
      OR: [
        { name: 'Просмотрено' },
        { name: 'Пересмотрено' },
      ],
    },
    select: { id: true },
  });
  
  return statuses.map(s => s.id);
}

export default personTwins;
