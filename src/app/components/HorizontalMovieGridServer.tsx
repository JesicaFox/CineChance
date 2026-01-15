// src/app/components/HorizontalMovieGridServer.tsx
import { fetchTrendingMovies } from '@/lib/tmdb';
import MovieCard from './MovieCard';
import './ScrollContainer.css';
import ScrollContainer from './ScrollContainer';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { isUnder18 } from '@/lib/age-utils';
import { Media } from '@/lib/tmdb';
import { revalidate, tags } from '@/lib/cache';

// Маппинг статусов
const STATUS_FROM_DB: Record<string, 'want' | 'watched' | 'dropped' | 'rewatched' | null> = {
  'Хочу посмотреть': 'want',
  'Просмотрено': 'watched',
  'Брошено': 'dropped',
  'Пересмотрено': 'rewatched',
};

// Интерфейс для данных MovieCard
interface MovieCardData {
  movie: Media;
  isBlacklisted: boolean;
  status: 'want' | 'watched' | 'dropped' | 'rewatched' | null;
  userRating: number | null;
}

// Enable ISR with 1 hour revalidation
export const revalidateTime = revalidate(3600);
export const cacheTagsList = tags(['trending-movies', 'home-page']);

export default async function HorizontalMovieGridServer() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  
  let blacklistedIds = new Set<number>();
  let shouldFilterAdult = false;
  let watchlistMap: Map<string, { status: string | null; userRating: number | null }> = new Map();

  // Загружаем данные пользователя на сервере для фильтрации
  if (userId) {
    try {
      const [blacklist, user] = await Promise.all([
        prisma.blacklist.findMany({
          where: { userId },
          select: { tmdbId: true }
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { birthDate: true }
        })
      ]);
      
      blacklistedIds = new Set(blacklist.map(b => b.tmdbId));
      
      if (user?.birthDate) {
        shouldFilterAdult = isUnder18(user.birthDate);
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
    }
  }

  // Загружаем watchlist на сервере
  if (userId) {
    try {
      const watchlist = await prisma.watchList.findMany({
        where: { userId },
        include: { status: true }
      });
      
      watchlist.forEach((item) => {
        watchlistMap.set(`${item.mediaType}_${item.tmdbId}`, { 
          status: item.status?.name || null, 
          userRating: item.userRating 
        });
      });
    } catch (error) {
      console.error("Failed to fetch watchlist", error);
    }
  }

  // Загружаем трендовые фильмы с ISR
  const movies = await fetchTrendingMovies('week');
  
  // Фильтруем: сначала черный список, потом взрослый контент
  let filteredMovies = movies.filter(movie => !blacklistedIds.has(movie.id));
  
  // Фильтруем взрослый контент для несовершеннолетних
  if (shouldFilterAdult) {
    filteredMovies = filteredMovies.filter(movie => !movie.adult);
  }
  
  const displayMovies = filteredMovies.slice(0, 20);

  // Подготавливаем данные для MovieCard
  const moviesWithData: MovieCardData[] = displayMovies.map((movie) => {
    const watchlistKey = `${movie.media_type}_${movie.id}`;
    const watchlistData = watchlistMap.get(watchlistKey);
    
    return {
      movie,
      isBlacklisted: blacklistedIds.has(movie.id),
      status: watchlistData ? (STATUS_FROM_DB[watchlistData.status || ''] || null) : null,
      userRating: watchlistData?.userRating || null,
    };
  });

  if (displayMovies.length === 0) {
    return (
      <div className="w-full">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6">
          <p className="text-yellow-300">Не удалось загрузить фильмы. Возможные причины:</p>
          <ul className="text-gray-400 text-sm mt-2 list-disc pl-5">
            <li>Проблемы с API ключом TMDB</li>
            <li>Ограничения API (лимит запросов)</li>
            <li>Временно недоступен сервер TMDB</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 mt-4">Популярное на этой неделе</h1>
      
      <ScrollContainer>
        {moviesWithData.map((data, index) => (
          <div key={data.movie.id} className="flex-shrink-0 w-48">
            <MovieCard 
              movie={data.movie} 
              priority={index < 4}
              initialIsBlacklisted={data.isBlacklisted}
              initialStatus={data.status}
              initialUserRating={data.userRating}
            />
          </div>
        ))}
      </ScrollContainer>
    </div>
  );
}
