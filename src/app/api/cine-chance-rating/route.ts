import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = parseInt(searchParams.get('tmdbId') || '0');
    const mediaType = searchParams.get('mediaType');

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: 'Missing tmdbId or mediaType' }, { status: 400 });
    }

    // Получаем все оценки для данного фильма
    const ratings = await prisma.watchList.findMany({
      where: {
        tmdbId,
        mediaType,
        userRating: { not: null },
      },
      select: {
        userRating: true,
      },
    });

    // Вычисляем среднее
    const ratingValues = ratings
      .map(r => r.userRating)
      .filter((r): r is number => r !== null);

    const averageRating = ratingValues.length > 0 
      ? ratingValues.reduce((sum, r) => sum + r, 0) / ratingValues.length 
      : null;

    return NextResponse.json({ 
      averageRating,
      count: ratingValues.length
    });
  } catch (error) {
    console.error('Cine-chance rating error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
