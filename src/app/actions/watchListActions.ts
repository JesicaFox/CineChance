// src/app/actions/watchListActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Media } from '@/lib/tmdb';

type StatusType = 'wantToWatch' | 'watched' | 'dropped' | null;

const statusIdMap: Record<NonNullable<StatusType>, number> = {
  wantToWatch: 1,
  watched: 2,
  dropped: 3,
};

export async function toggleMediaStatus(movie: Media, newStatus: StatusType) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Не авторизован');
  }

  const userId = session.user.id as string;
  const tmdbId = movie.id;
  // Определяем корректный mediaType (anime/cartoon/movie/tv)
  // Для совместимости: если нет genre_ids/original_language, fallback на movie.media_type
  let mediaType: 'movie' | 'tv' | 'anime' | 'cartoon' = movie.media_type;
  if (Array.isArray(movie.genre_ids) && typeof movie.original_language === 'string') {
    const { detectMediaType } = await import('@/lib/detectMediaType');
    mediaType = detectMediaType({
      genre_ids: movie.genre_ids,
      original_language: movie.original_language,
      media_type: movie.media_type,
    });
  }

  if (newStatus === null) {
    await prisma.watchList.deleteMany({
      where: {
        userId,
        tmdbId,
        mediaType,
      },
    });
  } else {
    const statusId = statusIdMap[newStatus];

    await prisma.watchList.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId,
          mediaType,
        },
      },
      update: {
        statusId,
        title: movie.title || movie.name || 'Без названия',
        voteAverage: movie.vote_average || 0,
      },
      create: {
        userId,
        tmdbId,
        mediaType,
        statusId,
        title: movie.title || movie.name || 'Без названия',
        voteAverage: movie.vote_average || 0,
      },
    });
  }

  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath('/my-movies');
}