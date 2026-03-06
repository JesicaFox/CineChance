// src/app/api/movie-details/route.ts

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/middleware/rateLimit';
import type { TMDbGenre, TMDbProductionCountry, TMDbCredits, TMDbCast } from '@/lib/types/tmdb';

// Full TMDB response with appended data
interface TMDBFullResponse {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count: number;
  overview: string;
  adult?: boolean;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  genres?: TMDbGenre[];
  production_countries?: TMDbProductionCountry[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  belongs_to_collection?: { id: number; name: string } | null;
  credits?: TMDbCredits;
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
}

export async function GET(req: Request) {
  const { success } = await rateLimit(req, '/api/movie-details');
  if (!success) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = parseInt(searchParams.get('tmdbId') || '0');
    const mediaType = searchParams.get('mediaType');

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU&append_to_response=credits,keywords`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
    }

    const data = await res.json() as TMDBFullResponse;

    // Получаем страны производства (первые 2 для компактности)
    const productionCountries = data.production_countries
      ?.slice(0, 2)
      ?.map((c: TMDbProductionCountry) => c.iso_3166_1 === 'US' ? 'США' : c.name)
      || [];

    // Для сериалов - количество сезонов
    const seasonNumber = mediaType === 'tv' && data.number_of_seasons
      ? `${data.number_of_seasons} ${getSeasonWord(data.number_of_seasons)}`
      : null;

    // Проверяем, является ли контент аниме (по keyword "anime" ID 210024)
    let isAnime = false;
    const keywords = data.keywords?.keywords || data.keywords?.results || [];
    if (keywords.length > 0) {
      isAnime = keywords.some((k: { id: number; name?: string }) => k.id === 210024 || k.name?.toLowerCase() === 'anime');
    }

    // Получаем первых 5 актеров из cast
    const cast = data.credits?.cast
      ?.slice(0, 5)
      ?.map((c: TMDbCast) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path,
      })) || [];

    return NextResponse.json({
      genres: data.genres?.map((g: TMDbGenre) => g.name) || [],
      runtime: data.runtime || data.episode_run_time?.[0] || 0,
      adult: data.adult || false,
      productionCountries,
      seasonNumber,
      isAnime,
      collectionName: data.belongs_to_collection?.name || null,
      collectionId: data.belongs_to_collection?.id || null,
      cast,
    });
  } catch (error) {
    logger.error('Movie details error', { 
      error: error instanceof Error ? error.message : String(error),
      context: 'MovieDetails'
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function getSeasonWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return 'сезонов';
  }
  if (mod10 === 1) {
    return 'сезон';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'сезона';
  }
  return 'сезонов';
}