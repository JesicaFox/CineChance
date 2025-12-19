// src/app/components/MovieCard.tsx
'use client';

import Image from 'next/image';
import { Movie } from '@/lib/tmdb';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';

  return (
    <div className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] w-full h-full min-w-0">
      {/* Контейнер постера с плавной анимацией */}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <Image
          src={imageUrl}
          alt={movie.title || 'Фильм без названия'}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 48vw,
                 (max-width: 768px) 31vw,
                 (max-width: 1024px) 23vw,
                 (max-width: 1280px) 19vw,
                 15vw"
          loading="lazy"
        />
        
        {/* Оверлей при наведении */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 sm:p-3">
          <h3 className="text-white font-bold text-xs sm:text-sm mb-1.5 line-clamp-3">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center bg-black/40 px-1.5 py-0.5 rounded">
              <span className="text-yellow-400 mr-1 text-xs">★</span>
              <span className="text-white font-medium">
                {movie.vote_average?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="bg-black/40 px-1.5 py-0.5 rounded">
              <span className="text-gray-300">
                {movie.release_date?.split('-')[0] || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Информация под постером */}
      <div className="mt-2 px-0.5">
        <h3 className="text-white font-medium text-xs sm:text-sm line-clamp-1 leading-tight">
          {movie.title}
        </h3>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center space-x-1">
            <div className="flex items-center bg-gray-800/50 px-1.5 py-0.5 rounded text-xs">
              <span className="text-yellow-400 mr-1">★</span>
              <span className="text-gray-200 font-medium">
                {movie.vote_average?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="text-xs text-gray-400 hidden sm:inline">
              {movie.release_date?.split('-')[0] || '—'}
            </div>
          </div>
          <div className="text-xs text-gray-400 sm:hidden">
            {movie.release_date?.split('-')[0] || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}