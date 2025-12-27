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
    // Извлекаем значения оценок
    const ratingValues = ratings
      .map((r: { userRating: number | null }) => r.userRating)
      .filter((r: number | null): r is number => r !== null);

    // Фильтруем NaN и значения <= 0
    const validRatings = ratingValues.filter((r: number) => 
      !isNaN(r) && r > 0
    );

    // Вычисляем среднее и округляем до 1 знака после запятой
    const averageRating = validRatings.length > 0 
      ? Math.round((validRatings.reduce((sum: number, r: number) => sum + r, 0) / validRatings.length) * 10) / 10
      : null;

    return NextResponse.json({ 
      averageRating,
      count: validRatings.length
    });
  } catch (error) {
    console.error('Cine-chance rating error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
