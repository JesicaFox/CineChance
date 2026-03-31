import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get first 5 anime records from DB
    const animeRecords = await prisma.watchList.findMany({
      where: { mediaType: 'anime' },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        statusId: true,
      },
      take: 5,
    });

    // Get first 5 cartoon records from DB
    const cartoonRecords = await prisma.watchList.findMany({
      where: { mediaType: 'cartoon' },
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        statusId: true,
      },
      take: 5,
    });

    // Count all records by mediaType
    const movieCount = await prisma.watchList.count({ where: { mediaType: 'movie' } });
    const tvCount = await prisma.watchList.count({ where: { mediaType: 'tv' } });
    const animeCount = await prisma.watchList.count({ where: { mediaType: 'anime' } });
    const cartoonCount = await prisma.watchList.count({ where: { mediaType: 'cartoon' } });

    // Fetch TMDB data for first anime record
    let animeWithTMDB = null;
    let tmdbError = null;
    if (animeRecords.length > 0) {
      const record = animeRecords[0];
      const apiKey = process.env.TMDB_API_KEY;
      
      if (!apiKey) {
        tmdbError = 'TMDB_API_KEY not set in environment';
      } else {
        try {
          // Try fetching as TV first (most common for anime)
          const url = `https://api.themoviedb.org/3/tv/${record.tmdbId}?api_key=${apiKey}`;
          console.log(`[DEBUG] Fetching from: ${url.replace(apiKey, 'HIDDEN_KEY')}`);
          
          const response = await fetch(url, { next: { revalidate: 0 } });
          
          console.log(`[DEBUG] Response status: ${response.status}`);
          
          if (response.ok) {
            const tmdbData = await response.json();
            animeWithTMDB = {
              record,
              source: 'tv',
              tmdbData: {
                title: tmdbData.name,
                genre_ids: tmdbData.genres?.map((g: any) => g.id) ?? [],
                original_language: tmdbData.original_language,
                poster_path: tmdbData.poster_path,
              },
            };
          } else {
            // Try fetching as movie if TV fails
            const movieUrl = `https://api.themoviedb.org/3/movie/${record.tmdbId}?api_key=${apiKey}`;
            const movieResponse = await fetch(movieUrl, { next: { revalidate: 0 } });
            
            if (movieResponse.ok) {
              const tmdbData = await movieResponse.json();
              animeWithTMDB = {
                record,
                source: 'movie',
                tmdbData: {
                  title: tmdbData.title,
                  genre_ids: tmdbData.genres?.map((g: any) => g.id) ?? [],
                  original_language: tmdbData.original_language,
                  poster_path: tmdbData.poster_path,
                },
              };
            } else {
              tmdbError = `TMDB API returned ${response.status} for TV and ${movieResponse.status} for Movie`;
            }
          }
        } catch (error) {
          tmdbError = error instanceof Error ? error.message : String(error);
        }
      }
    }

    return NextResponse.json({
      debug: {
        dbCounts: { movieCount, tvCount, animeCount, cartoonCount },
        animeRecords: animeRecords.map(r => ({ ...r, tmdbId: `(${r.mediaType}) ${r.tmdbId}` })),
        cartoonRecords: cartoonRecords.map(r => ({ ...r, tmdbId: `(${r.mediaType}) ${r.tmdbId}` })),
        animeWithTMDB,
        tmdbError,
        tmdbApiKeySet: !!process.env.TMDB_API_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
