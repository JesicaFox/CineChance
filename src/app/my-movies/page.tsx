// src/app/my-movies/page.tsx
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import MyMoviesClient from './MyMoviesClient';
import { fetchMoviesByStatus, getMoviesCounts } from './actions';

export default async function MyMoviesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white text-lg mb-6">Войдите, чтобы управлять своими списками фильмов</p>
          <Link href="/" className="text-blue-400 hover:underline">← На главную</Link>
        </div>
      </div>
    );
  }

  const userId = session.user.id;

  // Загружаем первые страницы для всех вкладок (с сортировкой по рейтингу по умолчанию)
  const [watchedData, wantToWatchData, droppedData, hiddenData, counts] = await Promise.all([
    fetchMoviesByStatus(userId, 'Просмотрено', false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, 'Хочу посмотреть', false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, 'Брошено', false, 1, 'rating', 'desc'),
    fetchMoviesByStatus(userId, null, true, 1, 'rating', 'desc'),
    getMoviesCounts(userId),
  ]);

  return (
    <MyMoviesClient
      initialWatched={watchedData.movies}
      initialWantToWatch={wantToWatchData.movies}
      initialDropped={droppedData.movies}
      initialHidden={hiddenData.movies}
      counts={counts}
      userId={userId}
    />
  );
}
