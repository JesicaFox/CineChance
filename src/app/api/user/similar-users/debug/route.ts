import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
  computeSimilarity,
  isSimilar,
} from '@/lib/taste-map/similarity';
import { getTasteMap } from '@/lib/taste-map/redis';
import { computeTasteMap } from '@/lib/taste-map/compute';

interface CandidateDebug {
  userId: string;
  tasteSimilarity?: number;
  ratingCorrelation?: number;
  personOverlap?: number;
  overallMatch?: number;
  isSimilar?: boolean;
  details?: {
    tasteMap: {
      genreProfile: Record<string, number>;
      personProfiles: {
        actorsCount: number;
        directorsCount: number;
      };
    };
  };
  error?: string;
}

interface Analysis {
  userId: string;
  userTasteMap: {
    genreProfile: Record<string, number>;
    personProfiles: {
      actorsCount: number;
      directorsCount: number;
    };
  };
  candidates: CandidateDebug[];
  stats: {
    totalAnalyzed: number;
    passedThreshold: number;
    failedThreshold: number;
    errors: number;
  };
}

/**
 * GET /api/user/similar-users/debug
 * 
 * Debug endpoint that shows detailed information about similarity calculations
 * for troubleshooting why similar users aren't being found.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10);
    const showDetails = searchParams.get('details') === 'true';

    // Get user's taste map (compute if not cached)
    const userTasteMap = await getTasteMap(userId, () => computeTasteMap(userId));
    if (!userTasteMap) {
      return NextResponse.json({
        error: 'Failed to compute user taste map',
        userId,
      }, { status: 500 });
    }

    // Get all other users (not just last 30 days)
    const allUsers = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true },
      take: 50,
    });

    logger.info('DEBUG: Starting similarity analysis', {
      userId,
      userTasteMap: {
        genreProfileCount: Object.keys(userTasteMap.genreProfile).length,
        actorsCount: Object.keys(userTasteMap.personProfiles.actors).length,
        directorsCount: Object.keys(userTasteMap.personProfiles.directors).length,
      },
      candidatesCount: allUsers.length,
      context: 'SimilarUsersDebug',
    });

     const analysis: Analysis = {
       userId,
       userTasteMap: {
         genreProfile: userTasteMap.genreProfile,
         personProfiles: {
           actorsCount: Object.keys(userTasteMap.personProfiles.actors).length,
           directorsCount: Object.keys(userTasteMap.personProfiles.directors).length,
         },
       },
       candidates: [],
       stats: {
         totalAnalyzed: 0,
         passedThreshold: 0,
         failedThreshold: 0,
         errors: 0,
       },
     };

    for (const candidate of allUsers.slice(0, limit)) {
      analysis.stats.totalAnalyzed++;

      try {
        const result = await computeSimilarity(userId, candidate.id);

         const candidateData: CandidateDebug = {
           userId: candidate.id,
           tasteSimilarity: Number((result.tasteSimilarity * 100).toFixed(2)),
           ratingCorrelation: Number((result.ratingCorrelation * 100).toFixed(2)),
           personOverlap: Number((result.personOverlap * 100).toFixed(2)),
           overallMatch: Number((result.overallMatch * 100).toFixed(2)),
           isSimilar: isSimilar(result),
         };

        if (showDetails) {
          const candidateTasteMap = await getTasteMap(candidate.id, () => computeTasteMap(candidate.id));
          if (candidateTasteMap) {
            candidateData.details = {
              tasteMap: {
                genreProfile: candidateTasteMap.genreProfile,
                personProfiles: {
                  actorsCount: Object.keys(candidateTasteMap.personProfiles.actors).length,
                  directorsCount: Object.keys(candidateTasteMap.personProfiles.directors).length,
                },
              },
            };
          }
        }

        analysis.candidates.push(candidateData);

        if (isSimilar(result)) {
          analysis.stats.passedThreshold++;
        } else {
          analysis.stats.failedThreshold++;
        }
      } catch (error) {
        analysis.stats.errors++;
        analysis.candidates.push({
          userId: candidate.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by overallMatch descending
    analysis.candidates.sort((a, b) => (b.overallMatch || 0) - (a.overallMatch || 0));

    return NextResponse.json(analysis);
  } catch (error) {
    logger.error('Failed to debug similar users', {
      error: error instanceof Error ? error.message : String(error),
      context: 'SimilarUsersDebug',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
