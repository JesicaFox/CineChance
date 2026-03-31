import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const animeCount = await prisma.watchList.count({
      where: { mediaType: 'anime' }
    });

    const cartoonCount = await prisma.watchList.count({
      where: { mediaType: 'cartoon' }
    });

    const movieCount = await prisma.watchList.count({
      where: { mediaType: 'movie' }
    });

    const tvCount = await prisma.watchList.count({
      where: { mediaType: 'tv' }
    });

    const animeExamples = await prisma.watchList.findMany({
      where: { mediaType: 'anime' },
      select: { id: true, tmdbId: true, title: true, mediaType: true },
      take: 5,
    });

    const cartoonExamples = await prisma.watchList.findMany({
      where: { mediaType: 'cartoon' },
      select: { id: true, tmdbId: true, title: true, mediaType: true },
      take: 5,
    });

    return NextResponse.json({
      summary: {
        anime: animeCount,
        cartoon: cartoonCount,
        movie: movieCount,
        tv: tvCount,
        total: animeCount + cartoonCount + movieCount + tvCount,
      },
      animeExamples,
      cartoonExamples,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
