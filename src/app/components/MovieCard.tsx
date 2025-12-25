// src/app/components/MovieCard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Media } from '@/lib/tmdb';

type MediaStatus = 'want' | 'watched' | 'dropped' | null;

interface MovieCardProps {
  movie: Media;
  restoreView?: boolean;
}

export default function MovieCard({ movie, restoreView = false }: MovieCardProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [status, setStatus] = useState<MediaStatus>(null);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/placeholder-poster.svg';
  
  const title = movie.title || movie.name || 'Без названия';
  const date = movie.release_date || movie.first_air_date;
  const year = date ? date.split('-')[0] : '—';

  // Хуки ВСЕГДА вызываются перед return
  useEffect(() => {
    if (restoreView) {
      setIsBlacklisted(true); 
      return;
    }

    const fetchData = async () => {
      try {
        const [statusRes, blacklistRes] = await Promise.all([
          fetch(`/api/watchlist?tmdbId=${movie.id}&mediaType=${movie.media_type}`),
          fetch(`/api/blacklist?tmdbId=${movie.id}&mediaType=${movie.media_type}`)
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data.status);
        }

        if (blacklistRes.ok) {
          const data = await blacklistRes.json();
          setIsBlacklisted(data.isBlacklisted);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchData();
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [movie.id, movie.media_type, restoreView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        showOverlay
      ) {
        setShowOverlay(false);
      }
    };

    if (showOverlay) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOverlay]);

  const handleStatusChange = async (newStatus: MediaStatus) => {
    const oldStatus = status;
    setStatus(newStatus);
    setShowOverlay(false);

    try {
      const res = await fetch('/api/watchlist', {
        method: newStatus === null ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id,
          mediaType: movie.media_type,
          status: newStatus,
          title: title,
          voteAverage: movie.vote_average,
        }),
      });
      if (!res.ok) setStatus(oldStatus);
    } catch (error) {
      setStatus(oldStatus);
    }
  };

  const handleBlacklistToggle = async () => {
    const method = restoreView ? 'DELETE' : (isBlacklisted ? 'DELETE' : 'POST');
    const targetState = restoreView ? false : !isBlacklisted;

    try {
      const res = await fetch('/api/blacklist', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id,
          mediaType: movie.media_type,
        }),
      });

      if (res.ok) {
        if (restoreView) {
          setIsRemoved(true);
        } else {
          setIsBlacklisted(targetState);
          setShowOverlay(false);
        }
      }
    } catch (error) {
      console.error('Network error', error);
    }
  };

  const getStatusIcon = () => {
    if (restoreView || isBlacklisted) {
      return (
        <div className="absolute top-2 right-2 z-10 bg-gray-800 rounded-full p-1.5 shadow-lg border border-gray-600">
          <div className="w-4 h-4 flex items-center justify-center">
            <span className="text-gray-300 text-sm font-bold">🚫</span>
          </div>
        </div>
      );
    }

    switch (status) {
      case 'want':
        return (
          <div className="absolute top-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-blue-500 text-lg font-bold leading-none" style={{ marginTop: '-1px' }}>+</span>
            </div>
          </div>
        );
      case 'watched':
        return (
          <div className="absolute top-2 right-2 z-10 bg-green-500 rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-white text-sm font-bold leading-none" style={{ marginTop: '-1px' }}>✓</span>
            </div>
          </div>
        );
      case 'dropped':
        return (
          <div className="absolute top-2 right-2 z-10 bg-red-500 rounded-full p-1.5 shadow-lg">
            <div className="w-4 h-4 flex items-center justify-center">
              <span className="text-white text-base font-bold leading-none flex items-center justify-center h-full">×</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCardClick = () => {
    if (isMobile) setShowOverlay(!showOverlay);
  };

  const handleMouseEnter = () => { 
    if (!isMobile) setShowOverlay(true); 
  };
  
  const handleMouseLeave = () => { 
    if (!isMobile) setShowOverlay(false); 
  };

  return (
    <>
      {/* Используем условный рендеринг вместо раннего возврата */}
      {isRemoved ? (
        <div className="w-full h-[200px] sm:h-[300px] border border-dashed border-gray-700 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 text-sm">Удалено из списка</span>
        </div>
      ) : (
        <div 
          ref={cardRef}
          className="group w-full h-full min-w-0 relative"
          onClick={handleCardClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="relative">
            <div className={`${movie.media_type === 'movie' ? 'bg-green-500' : 'bg-blue-500'} text-white text-xs font-semibold px-2 py-1.5 rounded-t-lg w-full text-center`}>
              {movie.media_type === 'movie' ? 'Фильм' : 'Сериал'}
            </div>
            
            <div className={`relative w-full aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-b-lg overflow-hidden shadow-lg transition-all duration-300 ${
              restoreView || isBlacklisted 
                ? 'opacity-60 grayscale hover:opacity-80 hover:grayscale-0' 
                : 'hover:shadow-xl'
            } ${showOverlay && !isMobile ? 'cursor-default' : 'cursor-pointer'}`}>
              
              {getStatusIcon()}

              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 48vw, (max-width: 768px) 31vw, (max-width: 1024px) 23vw, (max-width: 1280px) 19vw, 15vw"
                loading="lazy"
              />
              
              {!showOverlay && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 sm:p-3">
                  <h3 className="text-white font-bold text-xs sm:text-sm mb-1.5 line-clamp-3">
                    {title}
                  </h3>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center bg-black/40 px-1.5 py-0.5 rounded">
                      <span className="text-yellow-400 mr-1 text-xs">★</span>
                      <span className="text-white font-medium">
                        {movie.vote_average?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <div className="bg-black/40 px-1.5 py-0.5 rounded">
                      <span className="text-gray-300">{year}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showOverlay && (
              <div 
                ref={overlayRef}
                className="absolute -top-8 left-0 right-0 bottom-0 bg-black/80 flex flex-col items-center justify-center p-2 sm:p-3 z-50 rounded-lg"
              >
                <div className="w-full max-w-[140px] sm:max-w-[150px] space-y-1">
                  
                  {restoreView ? (
                    <button
                      onClick={handleBlacklistToggle}
                      className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200 hover:text-orange-900"
                    >
                      <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">🔓</span>
                      <span className="truncate">Разблокировать</span>
                    </button>
                  ) : (
                    <>
                      {isBlacklisted ? (
                        <button
                          onClick={handleBlacklistToggle}
                          className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200 hover:text-orange-900"
                        >
                          <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">🔓</span>
                          <span className="truncate">Разблокировать</span>
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleStatusChange('want')} className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${status === 'want' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">+</span>
                            <span className="truncate">Хочу посмотреть</span>
                          </button>
                          
                          <button onClick={() => handleStatusChange('watched')} className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${status === 'watched' ? 'bg-green-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">✓</span>
                            <span className="truncate">Просмотрено</span>
                          </button>
                          
                          <button onClick={() => handleStatusChange('dropped')} className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${status === 'dropped' ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">×</span>
                            <span className="truncate">Брошено</span>
                          </button>

                          <div className="h-px bg-gray-700 my-1"></div>

                          <button
                            onClick={handleBlacklistToggle}
                            className="w-full py-1 px-2 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-800/80 text-gray-400 hover:bg-red-900/50 hover:text-red-300 transition-colors flex items-center justify-start text-left cursor-pointer"
                          >
                            <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">🚫</span>
                            <span className="truncate">В черный список</span>
                          </button>

                          {status && (
                            <button
                              onClick={() => handleStatusChange(null)}
                              className="w-full py-1 px-2 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 mt-1 flex items-center justify-center cursor-pointer"
                            >
                              Убрать из списков
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-2 px-0.5">
            <h3 className={`text-xs sm:text-sm line-clamp-1 leading-tight ${isBlacklisted ? 'text-gray-500' : 'text-white font-medium'}`}>
              {title}
            </h3>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center bg-gray-800/50 px-1.5 py-0.5 rounded text-xs">
                <span className="text-yellow-400 mr-1">★</span>
                <span className="text-gray-200 font-medium">
                  {movie.vote_average?.toFixed(1) || '0.0'}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {year}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}