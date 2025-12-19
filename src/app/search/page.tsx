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
    <div className="min-h-screen bg-gray-950 py-3 sm:py-4">
      <div className="container mx-auto px-2 sm:px-3">
        {/* Минималистичный заголовок */}
        <div className="mb-3 sm:mb-4">
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
          // Простой и надежный grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {movies.map((movie) => (
              <div 
                key={movie.id} 
                className="p-1 sm:p-1.5 md:p-2" // Отступы внутри каждого элемента
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