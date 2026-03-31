import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/middleware/rateLimit';
import { getSimilarityScoreStats } from '@/lib/taste-map/similarity-storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { success } = await rateLimit(request, '/api/similarity/stats');
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const stats = await getSimilarityScoreStats();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalScores: stats.totalScores,
        uniqueUsers: stats.uniqueUsers,
        averageMatch: Number(stats.averageMatch.toFixed(4)),
        lastComputed: stats.lastComputed?.toISOString() || null,
        schedulerLastRun: stats.schedulerLastRun?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error('Failed to get similarity stats', {
      error: error instanceof Error ? error.message : String(error),
      context: 'SimilarityStats',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
