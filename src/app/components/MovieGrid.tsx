// src/app/components/MovieGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import { fetchTrendingMovies, Media } from '@/lib/tmdb';
import { BlacklistProvider } from './BlacklistContext';
import { AppErrorBoundary } from './ErrorBoundary';

export default function MovieGrid() {
  const [movies, setMovies] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      const trending = await fetchTrendingMovies('week');
      setMovies(trending);
      setLoading(false);
    }
    loadMovies();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="h-8 w-48 bg-gray-800 rounded skeleton-shimmer mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <MovieCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary
      fallback={
        <div className="py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-6">В тренде сейчас</h2>
            <div className="border-2 border-red-500/50 rounded-lg p-8 text-center">
              <p className="text-red-400 text-lg mb-4">Ошибка загрузки фильмов</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      }
    >
      <BlacklistProvider>
        <div className="py-8">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-white mb-6">В тренде сейчас</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie, index) => (
                <MovieCard key={movie.id} movie={movie} priority={index < 6} />
              ))}
            </div>
          </div>
        </div>
      </BlacklistProvider>
    </AppErrorBoundary>
  );
}
