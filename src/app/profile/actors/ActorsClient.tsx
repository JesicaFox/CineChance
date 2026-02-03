// src/app/profile/actors/ActorsClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users } from 'lucide-react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Loader from '@/app/components/Loader';
import { useActors } from '@/hooks/useActors';
import '@/app/profile/components/AchievementCards.css';

interface ActorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface ActorsClientProps {
  userId: string;
}

const ITEMS_PER_PAGE = 12;
const INITIAL_ITEMS = 24;

// Skeleton для карточки актера
function ActorCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-gray-800 border border-gray-700" />
      <div className="mt-2 h-4 bg-gray-800 rounded w-3/4" />
      <div className="mt-1 h-3 bg-gray-900 rounded w-1/2" />
    </div>
  );
}

// Skeleton для всей страницы
function PageSkeleton() {
  const skeletonCount = 12;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <ActorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function ActorsClient({ userId }: ActorsClientProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Use our optimized hook for infinite query
  const actorsQuery = useActors(userId);

  // Loading states
  const isLoading = actorsQuery.isLoading;
  const isFetchingNextPage = actorsQuery.isFetchingNextPage;
  const hasNextPage = actorsQuery.hasNextPage ?? false;
  const actors = actorsQuery.actors;
  const totalCount = actorsQuery.totalCount;

  // Fetch next page handler with safeguards
  const handleFetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
      isFetchingRef.current = true;
      actorsQuery.fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, actorsQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
          handleFetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px',
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasNextPage, isFetchingNextPage, handleFetchNextPage]);

  // Reset fetching ref when fetch completes
  useEffect(() => {
    if (!isFetchingNextPage) {
      isFetchingRef.current = false;
    }
  }, [isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton заголовка */}
        <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
        {/* Skeleton сетки */}
        <PageSkeleton />
      </div>
    );
  }

  if (actorsQuery.error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
        <p className="text-red-300">Не удалось загрузить актеров</p>
      </div>
    );
  }

  if (actors.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center py-10">
          У вас пока нет любимых актеров
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Сетка актеров */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {actors
          .sort((a, b) => {
            // Первичная сортировка по средней оценке (null в конце)
            if (a.average_rating !== null && b.average_rating !== null) {
              if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
              }
            } else if (a.average_rating === null && b.average_rating !== null) {
              return 1;
            } else if (a.average_rating !== null && b.average_rating === null) {
              return -1;
            }
            
            // Вторичная сортировка по проценту заполнения
            if (b.progress_percent !== a.progress_percent) {
              return b.progress_percent - a.progress_percent;
            }
            
            // Третичная сортировка по алфавиту
            return a.name.localeCompare(b.name, 'ru');
          })
          .map((actor, index) => {
            // Более гибкая формула для цветности с нелинейной прогрессией
            const progress = actor.progress_percent || 0;
            
            return (
              <Link
                key={actor.id}
                href={`/person/${actor.id}`}
                className="group relative"
              >
                <div className="relative">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-amber-500/50 transition-all relative">
                    {actor.profile_path ? (
                      <div className="w-full h-full relative">
                        <ImageWithProxy
                          src={`https://image.tmdb.org/t/p/w342${actor.profile_path}`}
                          alt={actor.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                          className="object-cover"
                          priority={index < 12}
                          quality={80}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Users className="w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{ 
                          width: `${progress}%`,
                          opacity: progress === 0 ? 0.3 : 1
                        }}
                      />
                    </div>
                    
                    <div className="absolute top-2 right-2 bg-amber-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                      {progress}%
                    </div>
                  </div>
                  
                  <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-amber-400 transition-colors">
                    {actor.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">
                      <span className="text-green-400">{actor.watched_movies}</span>
                      {' / '}
                      <span>{actor.total_movies}</span>
                      {' фильмов'}
                    </p>
                    {actor.average_rating !== null && (
                      <div className="flex items-center bg-gray-800/50 rounded text-sm flex-shrink-0">
                        <div className="w-5 h-5 relative mx-1">
                          <Image 
                            src="/images/logo_mini_lgt.png" 
                            alt="CineChance Logo" 
                            fill 
                            className="object-contain" 
                          />
                        </div>
                        <span className="text-gray-200 font-medium pr-2">
                          {actor.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
      </div>

      {/* Sentinel для infinite scroll */}
      <div ref={sentinelRef} className="h-4" />

      {/* Кнопка "Ещё" */}
      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleFetchNextPage}
            disabled={isFetchingNextPage}
            className="px-6 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isFetchingNextPage ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
                Загрузка...
              </>
            ) : (
              'Ещё...'
            )}
          </button>
        </div>
      )}

      {/* Индикатор загрузки в конце */}
      {isFetchingNextPage && (
        <div className="flex justify-center mt-6">
          <Loader size="small" />
        </div>
      )}

      <p className="text-gray-500 text-sm text-center pt-4">
        Показано {actors.length} из {totalCount} актеров
      </p>
    </>
  );
}
