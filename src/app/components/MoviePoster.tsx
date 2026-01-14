// src/app/components/MoviePoster.tsx
'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { Media } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

interface MoviePosterProps {
  movie: Media;
  priority?: boolean;
  isBlacklisted?: boolean;
  restoreView?: boolean;
  isHovered?: boolean;
  showOverlay?: boolean;
  onError?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  children?: React.ReactNode;
}

const MoviePoster = memo(({
  movie,
  priority = false,
  isBlacklisted = false,
  restoreView = false,
  isHovered = false,
  showOverlay = false,
  onError,
  onMouseEnter,
  onMouseLeave,
  onClick,
  children
}: MoviePosterProps) => {
  const [imageError, setImageError] = useState(false);
  const [fanartPoster, setFanartPoster] = useState<string | null>(null);
  const [isTryingFanart, setIsTryingFanart] = useState(false);

  const handlePosterError = async () => {
    if (!isTryingFanart && !fanartPoster && movie.poster_path) {
      setIsTryingFanart(true);
      try {
        const res = await fetch(`/api/fanart-poster?tmdbId=${movie.id}&mediaType=${movie.media_type}`);
        if (res.ok) {
          const data = await res.json();
          if (data.poster) {
            setFanartPoster(data.poster);
            return;
          }
        }
      } catch (error) {
        logger.error('Failed to fetch Fanart.tv poster', { tmdbId: movie.id, mediaType: movie.media_type, error });
      }
    }
    setImageError(true);
    onError?.();
  };

  const imageUrl = imageError
    ? '/placeholder-poster.svg'
    : fanartPoster || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/placeholder-poster.svg');

  return (
    <div
      className={`relative w-full aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-none overflow-hidden shadow-lg transition-all duration-300 ${
        restoreView || isBlacklisted
          ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0'
          : isHovered && !showOverlay ? 'shadow-xl' : ''
      } ${showOverlay ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}

      <Image
        src={imageUrl}
        alt={movie.title || movie.name || 'Poster'}
        fill
        className={`object-cover transition-transform duration-500 ${
          isHovered && !showOverlay ? 'scale-105' : ''
        }`}
        sizes="(max-width: 640px) 48vw, (max-width: 768px) 31vw, (max-width: 1024px) 23vw, (max-width: 1280px) 19vw, 15vw"
        loading={priority ? "eager" : "lazy"}
        onError={handlePosterError}
      />
    </div>
  );
});

MoviePoster.displayName = 'MoviePoster';

export default MoviePoster;