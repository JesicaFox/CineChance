// src/app/profile/collections/CollectionsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Film } from 'lucide-react';
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
}

interface CollectionsClientProps {
  userId: string;
}

const ITEMS_PER_PAGE = 12;
const INITIAL_ITEMS = 24;

export default function CollectionsClient({ userId }: CollectionsClientProps) {
  const [allCollections, setAllCollections] = useState<CollectionAchievement[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/user/achiev_collection');
        if (!res.ok) throw new Error('Failed to fetch collections');
        const data = await res.json();
        setAllCollections(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch collections:', err);
        setError('Не удалось загрузить коллекции');
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [userId]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const visibleCollections = allCollections.slice(0, visibleCount);
  const hasMore = visibleCount < allCollections.length;
  const isLoadingMore = false; // For loading state during pagination

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <Loader text="Загрузка коллекций..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (allCollections.length === 0) {
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
          .sort((a, b) => b.progress_percent - a.progress_percent)
          .map((collection) => {
            // Рассчитываем grayscale и saturate на основе прогресса
            const grayscaleValue = 100 - collection.progress_percent;
            const saturateValue = collection.progress_percent;
            
            return (
              <Link
                key={collection.id}
                href={`/collection/${collection.id}`}
                className="group relative"
              >
                <div className="relative">
                  {/* Постер */}
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-purple-500/50 transition-all relative">
                    {collection.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w300${collection.poster_path}`}
                        alt={collection.name}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster"
                        style={{ 
                          filter: `grayscale(${grayscaleValue}%) saturate(${saturateValue}%)`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    
                    {/* Прогресс просмотра */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                      <div 
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${collection.progress_percent}%` }}
                      />
                    </div>
                    
                    {/* Процент просмотра */}
                    <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                      {collection.progress_percent}%
                    </div>
                  </div>
                  
                  {/* Название */}
                  <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-purple-400 transition-colors">
                    {collection.name.replace(/\s*\(Коллекция\)\s*$/i, '')}
                  </h3>
                  
                  {/* Статистика */}
                  <p className="text-gray-500 text-xs">
                    <span className="text-green-400">{collection.watched_movies}</span>
                    {' / '}
                    <span>{collection.total_movies}</span>
                    {' фильмов'}
                  </p>
                </div>
              </Link>
            );
          })}
      </div>

      {/* Кнопка "Ещё" */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 rounded-lg bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingMore ? (
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

      {/* Итого */}
      <p className="text-gray-500 text-sm text-center pt-4">
        Показано {visibleCollections.length} из {allCollections.length} коллекций
      </p>

      {/* Кнопка "Наверх" */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors z-50"
          aria-label="Наверх"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
}
