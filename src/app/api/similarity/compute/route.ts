import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/middleware/rateLimit';
import { computeAllSimilarityScores } from '@/lib/tasks/computeSimilarityScores';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { success } = await rateLimit(request, '/api/similarity/compute');
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    logger.warn('Unauthorized similarity computation attempt', { context: 'SimilarityCron' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    logger.info('Starting scheduled similarity computation', {
      limit,
      offset,
      context: 'SimilarityCron',
    });

    const result = await computeAllSimilarityScores({
      limit,
      offset,
      onProgress: (progress) => {
        logger.info('Similarity computation progress', {
          ...progress,
          context: 'SimilarityCron',
        });
      },
    });

    logger.info('Scheduled similarity computation completed', {
      processed: result.processed,
      computed: result.computed,
      errors: result.errors,
      duration: result.duration,
      context: 'SimilarityCron',
    });

    return NextResponse.json({
      success: true,
      type: 'similarity-computation',
      executedAt: result.timestamp.toISOString(),
      duration: result.duration,
      results: {
        processed: result.processed,
        computed: result.computed,
        errors: result.errors,
      },
      errorsList: result.errorsList,
    });
  } catch (error) {
    logger.error('Scheduled similarity computation failed', {
      error: error instanceof Error ? error.message : String(error),
      context: 'SimilarityCron',
    });

    return NextResponse.json(
      { success: false, error: 'Similarity computation failed' },
      { status: 500 }
    );
  }
}
