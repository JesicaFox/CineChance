// src/app/components/MoviePosterProxy.tsx
'use client';

import { useState, useEffect, memo, useRef } from 'react';
import Image from 'next/image';
import { Media } from '@/lib/tmdb';
import { logger } from '@/lib/logger';

interface MoviePosterProxyProps {
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

const MoviePosterProxy = memo(({
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
}: MoviePosterProxyProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowLoadingWarning, setShowSlowLoadingWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // При изменении movie сбрасываем все состояния загрузки
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    setIsLoading(true);
    setShowSlowLoadingWarning(false);
  }, [movie.id, movie.poster_path]);

  // Проверяем если изображение уже загруженно в браузер кэш
  useEffect(() => {
    const checkBrowserCache = () => {
      if (!containerRef.current || imageLoaded) return;
      
      const img = containerRef.current.querySelector('img') as HTMLImageElement | null;
      if (!img) return;

      // Проверяем если изображение уже полностью загружено (в браузерном кэше)
      if (img.complete && img.naturalHeight > 0) {
        logger.debug('Image loaded from browser cache', { movieId: movie.id, complete: img.complete, naturalHeight: img.naturalHeight });
        
        // Принудительно устанавливаем loaded state для кэшированных изображений
        handleImageLoad();
      }
    };

    // Проверяем дважды - сразу и через небольшую задержку для гарантии
    checkBrowserCache();
    const timer = setTimeout(checkBrowserCache, 50);
    return () => clearTimeout(timer);
  }, [movie.id, imageLoaded]);

  // Показываем предупреждение о медленной загрузке через 3 секунды
  useEffect(() => {
    if (!isLoading) return;
    
    const timer = setTimeout(() => {
      if (isLoading && !imageLoaded) {
        logger.warn('Slow loading warning', { movieId: movie.id, retryCount });
        setShowSlowLoadingWarning(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading, imageLoaded, movie.id, retryCount]);

  const handlePosterError = () => {
    logger.warn('Poster load failed (proxy), trying next source', { 
      tmdbId: movie.id, 
      retryCount 
    });
    
    if (retryCount < 1) { // Уменьшили количество попыток для скорости
      // Сбрасываем imageLoaded перед retry, но продолжаем с isLoading для отслеживания новой попытки
      setImageLoaded(false);
      setShowSlowLoadingWarning(false);
      setRetryCount(prev => prev + 1);
    } else {
      logger.warn('All poster attempts failed (proxy), showing placeholder', { tmdbId: movie.id });
      setImageError(true);
      setIsLoading(false);
      setShowSlowLoadingWarning(false);
      onError?.();
    }
  };

  const handleImageLoad = () => {
    logger.debug('Image onLoad fired', { movieId: movie.id, retryCount });
    setImageLoaded(true);
    setIsLoading(false);
    setShowSlowLoadingWarning(false);
  };

  // Генерируем URL через наш прокси
  const getProxyUrl = () => {
    const tmdbUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
    
    if (!tmdbUrl) {
      return '/placeholder-poster.svg';
    }

    // Добавляем timestamp только при retry
    const timestamp = retryCount > 0 ? `&t=${Date.now()}` : '';
    
    // Передаем tmdbId и mediaType для использования FANART_TV как fallback
    const params = new URLSearchParams({
      url: tmdbUrl,
      tmdbId: String(movie.id),
      mediaType: movie.media_type || 'movie',
    });
    
    return `/api/image-proxy?${params}${timestamp}`;
  };

  const imageUrl = imageError ? '/placeholder-poster.svg' : getProxyUrl();

  return (
    <div
      ref={containerRef}
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

      {/* Loading indicator с улучшенным UX */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-2"></div>
          {showSlowLoadingWarning && (
            <div className="text-center">
              <span className="text-gray-400 text-xs">Медленная загрузка...</span>
              <div className="mt-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setRetryCount(prev => prev + 1);
                  }}
                  className="text-blue-400 text-xs hover:text-blue-300 underline"
                >
                  Попробовать снова
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Используем Next.js Image с оптимизациями */}
      <Image
        key={`${movie.id}-proxy-${retryCount}`}
        src={imageUrl}
        alt={movie.title || movie.name || 'Poster'}
        fill
        className={`object-cover transition-opacity duration-300 ${
          isHovered && !showOverlay ? 'scale-105' : ''
        } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        sizes="(max-width: 640px) 40vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
        loading={priority ? "eager" : "lazy"}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        onError={handlePosterError}
        onLoad={handleImageLoad}
        unoptimized={true}
        quality={75} // Снижаем качество для скорости
      />
    </div>
  );
});

MoviePosterProxy.displayName = 'MoviePosterProxy';

export default MoviePosterProxy;
