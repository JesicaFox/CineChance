import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// Genre ID to name mapping (TMDb + Anime genres)
const GENRE_MAP: Record<number, string> = {
  // TMDb Genres
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // Anime-specific genre IDs (using higher numbers to avoid conflicts)
  100: 'Action Anime',
  101: 'Adventure Anime',
  102: 'Comedy Anime',
  103: 'Drama Anime',
  104: 'Fantasy Anime',
  105: 'Horror Anime',
  106: 'Mecha Anime',
  107: 'Music Anime',
  108: 'Mystery Anime',
  109: 'Psychological Anime',
  110: 'Romance Anime',
  111: 'Sci-Fi Anime',
  112: 'Slice of Life Anime',
  113: 'Sports Anime',
  114: 'Supernatural Anime',
  115: 'Thriller Anime',
};

// Helper function to fetch media details from TMDB
async function fetchMediaDetails(tmdbId: number, mediaType: 'movie' | 'tv') {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${apiKey}&language=ru-RU`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all movie entries from user's watch lists
    const watchListRecords = await prisma.watchList.findMany({
      where: { userId: session.user.id },
      select: { tmdbId: true, mediaType: true },
    });

    if (watchListRecords.length === 0) {
      return NextResponse.json({ genres: [] });
    }

    // Load TMDB details for all records and collect unique genres
    const genreSet = new Set<number>();
    const genreNames = new Map<number, string>();

    for (const record of watchListRecords) {
      const tmdbData = await fetchMediaDetails(record.tmdbId, record.mediaType as 'movie' | 'tv');
      if (tmdbData?.genres) {
        for (const genre of tmdbData.genres) {
          genreSet.add(genre.id);
          genreNames.set(genre.id, genre.name);
        }
      }
    }

    // Convert to array with names
    const genres = Array.from(genreSet)
      .map((id) => ({
        id,
        name: genreNames.get(id) || GENRE_MAP[id] || `Genre ${id}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ genres });
  } catch (error) {
    console.error('Error fetching user genres:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}
