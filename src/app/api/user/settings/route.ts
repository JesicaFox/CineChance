// src/app/api/user/settings/route.ts
 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { rateLimit } from '@/middleware/rateLimit';

// GET /api/user/settings - Получить настройки пользователя
export async function GET(req: Request) {
  const { success } = await rateLimit(req, '/api/user');
  if (!success) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Получаем настройки рекомендаций пользователя
    const settings = await prisma.recommendationSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        minRating: true,
        preferHighRating: true,
        avoidRewatches: true,
        preferUnwatched: true,
        noveltyWeight: true,
        randomnessWeight: true,
        includeWant: true,
        includeWatched: true,
        includeDropped: true,
        includeMovie: true,
        includeTv: true,
        includeAnime: true,
        includeCartoon: true,
      },
    });

    if (!settings) {
      // Если настроек нет, возвращаем значения по умолчанию
      return NextResponse.json(
        {
          success: true,
          minRating: 6.0,
          preferHighRating: true,
          avoidRewatches: false,
          preferUnwatched: true,
          noveltyWeight: 1.0,
          randomnessWeight: 1.0,
          includeWant: true,
          includeWatched: true,
          includeDropped: false,
          includeMovie: true,
          includeTv: true,
          includeAnime: true,
          includeCartoon: true,
        },
        { status: 200 }
      );
    }

    // Если minRating равен null, возвращаем 6.0 как значение по умолчанию
    return NextResponse.json(
      {
        success: true,
        minRating: settings.minRating ?? 6.0,
        preferHighRating: settings.preferHighRating,
        avoidRewatches: settings.avoidRewatches,
        preferUnwatched: settings.preferUnwatched,
        noveltyWeight: settings.noveltyWeight,
        randomnessWeight: settings.randomnessWeight,
        includeWant: settings.includeWant,
        includeWatched: settings.includeWatched,
        includeDropped: settings.includeDropped,
        includeMovie: settings.includeMovie,
        includeTv: settings.includeTv,
        includeAnime: settings.includeAnime,
        includeCartoon: settings.includeCartoon,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error getting user settings', {
      error: error instanceof Error ? error.message : String(error),
      context: 'UserSettings'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings - Обновить настройки пользователя
export async function PUT(req: Request) {
  const { success } = await rateLimit(req, '/api/user');
  if (!success) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { minRating, includeWant, includeWatched, includeDropped, includeMovie, includeTv, includeAnime, includeCartoon } = body;

    // Валидация minRating
    if (minRating !== undefined) {
      if (typeof minRating !== 'number' || minRating < 1 || minRating > 10) {
        return NextResponse.json(
          { error: "minRating must be a number between 1 and 10" },
          { status: 400 }
        );
      }
    }

    // Валидация булевых полей
    if (includeWant !== undefined && typeof includeWant !== 'boolean') {
      return NextResponse.json(
        { error: "includeWant must be a boolean" },
        { status: 400 }
      );
    }
    if (includeWatched !== undefined && typeof includeWatched !== 'boolean') {
      return NextResponse.json(
        { error: "includeWatched must be a boolean" },
        { status: 400 }
      );
    }
    if (includeDropped !== undefined && typeof includeDropped !== 'boolean') {
      return NextResponse.json(
        { error: "includeDropped must be a boolean" },
        { status: 400 }
      );
    }
    if (includeMovie !== undefined && typeof includeMovie !== 'boolean') {
      return NextResponse.json(
        { error: "includeMovie must be a boolean" },
        { status: 400 }
      );
    }
    if (includeTv !== undefined && typeof includeTv !== 'boolean') {
      return NextResponse.json(
        { error: "includeTv must be a boolean" },
        { status: 400 }
      );
    }
    if (includeAnime !== undefined && typeof includeAnime !== 'boolean') {
      return NextResponse.json(
        { error: "includeAnime must be a boolean" },
        { status: 400 }
      );
    }
    if (includeCartoon !== undefined && typeof includeCartoon !== 'boolean') {
      return NextResponse.json(
        { error: "includeCartoon must be a boolean" },
        { status: 400 }
      );
    }

    // Обновляем или создаём настройки рекомендаций
    const settings = await prisma.recommendationSettings.upsert({
      where: { userId: session.user.id },
      update: {
        minRating: minRating !== undefined ? minRating : undefined,
        includeWant: includeWant !== undefined ? includeWant : undefined,
        includeWatched: includeWatched !== undefined ? includeWatched : undefined,
        includeDropped: includeDropped !== undefined ? includeDropped : undefined,
        includeMovie: includeMovie !== undefined ? includeMovie : undefined,
        includeTv: includeTv !== undefined ? includeTv : undefined,
        includeAnime: includeAnime !== undefined ? includeAnime : undefined,
        includeCartoon: includeCartoon !== undefined ? includeCartoon : undefined,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        minRating: minRating ?? 5.0,
        preferHighRating: true,
        avoidRewatches: false,
        preferUnwatched: true,
        noveltyWeight: 1.0,
        randomnessWeight: 1.0,
        includeWant: includeWant ?? true,
        includeWatched: includeWatched ?? true,
        includeDropped: includeDropped ?? false,
        includeMovie: includeMovie ?? true,
        includeTv: includeTv ?? true,
        includeAnime: includeAnime ?? true,
        includeCartoon: includeCartoon ?? true,
      },
    });

    logger.info('User settings updated', {
      userId: session.user.id,
      updatedFields: { minRating, includeWant, includeWatched, includeDropped, includeMovie, includeTv, includeAnime, includeCartoon },
      context: 'UserSettings'
    });

    return NextResponse.json(
      {
        success: true,
        minRating: settings.minRating,
        preferHighRating: settings.preferHighRating,
        avoidRewatches: settings.avoidRewatches,
        preferUnwatched: settings.preferUnwatched,
        noveltyWeight: settings.noveltyWeight,
        randomnessWeight: settings.randomnessWeight,
        includeWant: settings.includeWant,
        includeWatched: settings.includeWatched,
        includeDropped: settings.includeDropped,
        includeMovie: settings.includeMovie,
        includeTv: settings.includeTv,
        includeAnime: settings.includeAnime,
        includeCartoon: settings.includeCartoon,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error updating user settings', {
      error: error instanceof Error ? error.message : String(error),
      context: 'UserSettings'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
