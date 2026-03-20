import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cleanupOrphanedScores } from '@/lib/taste-map/similarity-storage';

export async function POST(request: NextRequest) {
  try {
    const result = await cleanupOrphanedScores();

    logger.info('Manual orphan cleanup executed', {
      deleted: result.deleted,
      orphans: result.orphans,
      context: 'SimilarityCleanup',
    });

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      orphans: result.orphans,
    });
  } catch (error) {
    logger.error('Manual orphan cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
      context: 'SimilarityCleanup',
    });

    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
