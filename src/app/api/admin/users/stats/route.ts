import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { MOVIE_STATUS_IDS } from '@/lib/movieStatusConstants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.watchList.groupBy({
        by: ['userId'],
        where: {
          statusId: { in: [MOVIE_STATUS_IDS.WATCHED, MOVIE_STATUS_IDS.REWATCHED] },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalUsers,
      activeUsers: activeUsers.length,
    });
  } catch (error) {
    logger.error('Failed to get users stats', {
      error: error instanceof Error ? error.message : String(error),
      context: 'AdminUsersStats',
    });

    return NextResponse.json(
      { success: false, error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
