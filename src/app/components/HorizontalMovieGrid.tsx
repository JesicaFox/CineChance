// src/app/components/HorizontalMovieGrid.tsx
'use client';

import { useEffect, useState } from 'react';
import MovieCard from './MovieCard';
import { fetchTrendingMovies, Media } from '@/lib/tmdb';
import { BlacklistProvider } from './BlacklistContext';
import LoaderSkeleton from './LoaderSkeleton';

export default function HorizontalMovieGrid() {
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
      <LoaderSkeleton variant="horizontal" text="Загрузка популярных фильмов..." skeletonCount={6} />
    );
  }

  return (
    <BlacklistProvider>
      <div className="py-8">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-6">В тренде сейчас</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
            {movies.map((movie, index) => (
              <div key={movie.id} className="w-48 flex-shrink-0">
                <MovieCard movie={movie} priority={index < 4} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BlacklistProvider>
  );
}
