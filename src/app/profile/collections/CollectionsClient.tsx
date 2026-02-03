// src/app/profile/collections/CollectionsClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Image from 'next/image';
import Link from 'next/link';
import { Film } from 'lucide-react';
import { useCollections } from '@/hooks/useCollections';
import Loader from '@/app/components/Loader';
import '@/app/profile/components/AchievementCards.css';

interface CollectionAchievement {
  id: number;
  name: string;
  poster_path: string | null;
  total_movies: number;
  added_movies: number;
  watched_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface CollectionsClientProps {
  userId: string;
}

const ITEMS_PER_PAGE = 12;
const INITIAL_ITEMS = 24;

// Skeleton для карточки коллекции
function CollectionCardSkeleton() {
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
        <CollectionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CollectionsClient({ userId }: CollectionsClientProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Use our optimized hook for infinite query
  const collectionsQuery = useCollections(userId);

  // Loading states
  const isLoading = collectionsQuery.isLoading;
  const isFetchingNextPage = collectionsQuery.isFetchingNextPage;
  const hasNextPage = collectionsQuery.hasNextPage ?? false;
  const collections = collectionsQuery.collections;
  const totalCount = collectionsQuery.totalCount;

  // Fetch next page handler with safeguards
  const handleFetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
      isFetchingRef.current = true;
      collectionsQuery.fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, collectionsQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const sentinel = entries[0];
        if (sentinel.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
          isFetchingRef.current = true;
          collectionsQuery.fetchNextPage();
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
  }, [hasNextPage, isFetchingNextPage, collectionsQuery]);

  // Reset fetching ref when fetch completes
  useEffect(() => {
    if (!isFetchingNextPage) {
      isFetchingRef.current = false;
    }
  }, [isFetchingNextPage]);

  const visibleCollections = collections.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < collections.length;
  const isLoadingMore = false;

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

  if (collectionsQuery.error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
        <p className="text-red-300">Не удалось загрузить коллекции</p>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center py-10">
          У вас пока нет коллекций с просмотренными фильмами
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Сетка коллекций */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {visibleCollections
          .sort((a, b) => {
            // Сначала по рейтингу (desc), null в конце
            if (a.average_rating !== null && b.average_rating !== null) {
              if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
              }
            } else if (a.average_rating === null && b.average_rating !== null) {
              return 1;
            } else if (a.average_rating !== null && b.average_rating === null) {
              return -1;
            }
            
            // Если рейтинги равны или оба null, сортируем по прогрессу (desc)
            if (b.progress_percent !== a.progress_percent) {
              return b.progress_percent - a.progress_percent;
            }
            
            // Если и прогресс одинаковый, сортируем по алфавиту (asc)
            return a.name.localeCompare(b.name, 'ru');
          })
          .map((collection) => {
            // Более гибкая формула для цветности с нелинейной прогрессией
            const progress = collection.progress_percent;
            const grayscale = 100 - progress;
            // Используем кубическую функцию для более естественного восприятия
            const saturate = Math.max(0.2, Math.pow(progress / 100, 1.5));
            
            return (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="group relative"
              >
                <div className="relative">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-purple-500/50 transition-all relative">
                    {collection.poster_path ? (
                      <div className="w-full h-full relative">
                        <ImageWithProxy
                          src={`https://image.tmdb.org/t/p/w300${collection.poster_path}`}
                          alt={collection.name}
                          fill
                          className="object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster"
                          sizes="120px"
                          style={{ 
                            filter: `grayscale(${grayscale}%) saturate(${saturate})`
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                      <div 
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${collection.progress_percent}%` }}
                      />
                    </div>
                    
                    <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                      {collection.progress_percent}%
                    </div>
                  </div>
                  
                  <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-purple-400 transition-colors">
                    {collection.name.replace(/\s*\(Коллекция\)\s*$/i, '')}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">
                      <span className="text-green-400">{collection.watched_movies}</span>
                      {' / '}
                      <span>{collection.total_movies}</span>
                      {' фильмов'}
                    </p>
                    {collection.average_rating !== null && (
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
                          {collection.average_rating.toFixed(1)}
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
        Показано {visibleCollections.length} из {totalCount} коллекций
      </p>
    </>
  );
}
