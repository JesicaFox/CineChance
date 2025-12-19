// src/app/search/page.tsx
import { searchMovies } from '@/lib/tmdb';
import MovieCard from '../components/MovieCard';
import Link from 'next/link';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const movies = query ? await searchMovies(query) : [];

  return (
    <div className="min-h-screen bg-gray-950 py-4">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Компактный заголовок */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-base sm:text-lg font-medium text-white inline">
            {query ? `Поиск: "${query}"` : 'Поиск фильмов'}
          </h1>
          {query && movies.length > 0 && (
            <span className="text-gray-400 text-sm ml-2">
              ({movies.length} {movies.length === 1 ? 'результат' : movies.length < 5 ? 'результата' : 'результатов'})
            </span>
          )}
        </div>

        {!query ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Введите запрос в поисковую строку выше</p>
            <Link href="/" className="text-blue-400 hover:underline mt-3 inline-block text-xs">
              ← На главную
            </Link>
          </div>
        ) : movies.length > 0 ? (
          // Адаптивная сетка с надежными отступами
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {movies.map((movie) => (
              <div 
                key={movie.id} 
                className="w-full min-w-0 p-1"
              >
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-2">Ничего не найдено</p>
            <p className="text-gray-500 text-xs mb-4">Попробуйте другой запрос</p>
            <Link href="/" className="text-blue-400 hover:underline inline-block text-xs">
              ← На главную
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}