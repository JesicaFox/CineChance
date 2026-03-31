import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/middleware/rateLimit';
import { cleanupOrphanedScores } from '@/lib/taste-map/similarity-storage';

/**
 * Weekly cron endpoint for orphan cleanup
 * Runs every Sunday at 3:00 AM UTC
 */

export async function GET(request: NextRequest) {
  const { success } = await rateLimit(request, '/api/recommendations');
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    logger.warn('Unauthorized weekly cron access attempt', { context: 'WeeklyCron' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Cleanup orphaned similarity scores
    const orphanResult = await cleanupOrphanedScores();

    logger.info('Weekly orphan cleanup completed', {
      deleted: orphanResult.deleted,
      orphans: orphanResult.orphans,
      context: 'WeeklyCron',
    });

    return NextResponse.json({
      success: true,
      type: 'weekly-orphan-cleanup',
      executedAt: new Date().toISOString(),
      deleted: orphanResult.deleted,
      orphans: orphanResult.orphans,
    });
  } catch (error) {
    logger.error('Weekly orphan cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
      context: 'WeeklyCron',
    });
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
