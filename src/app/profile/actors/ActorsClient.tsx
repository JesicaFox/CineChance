// src/app/profile/actors/ActorsClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import Loader from '@/app/components/Loader';
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

export default function ActorsClient({ userId }: ActorsClientProps) {
  const [allActors, setAllActors] = useState<ActorAchievement[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_ITEMS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const fetchActors = async () => {
      try {
        const res = await fetch('/api/user/achiev_actors');
        if (!res.ok) throw new Error('Failed to fetch actors');
        const data = await res.json();
        setAllActors(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch actors:', err);
        setError('Не удалось загрузить актеров');
      } finally {
        setLoading(false);
      }
    };

    fetchActors();
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

  const visibleActors = allActors.slice(0, visibleCount);
  const hasMore = visibleCount < allActors.length;
  const isLoadingMore = false; // For loading state during pagination

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <Loader text="Загрузка актеров..." />
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

  if (allActors.length === 0) {
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
        {visibleActors.map((actor) => {
          // Используем progress_percent из API
          const progressPercent = actor.progress_percent || 0;
          // Рассчитываем grayscale и saturate на основе прогресса
          const grayscaleValue = 100 - progressPercent;
          const saturateValue = progressPercent;
          
          return (
            <Link
              key={actor.id}
              href={`/person/${actor.id}`}
              className="group relative"
            >
              <div className="relative">
                {/* Фото актера */}
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-amber-500/50 transition-all relative">
                  {actor.profile_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`}
                      alt={actor.name}
                      className="w-full h-full object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster"
                      style={{ 
                        filter: `grayscale(${grayscaleValue}%) saturate(${saturateValue}%)`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  
                  {/* Прогресс просмотра */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                    <div 
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  
                  {/* Количество фильмов */}
                  <div className="absolute top-2 right-2 bg-amber-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                    {actor.progress_percent}%
                  </div>
                </div>
                
                {/* Имя актера */}
                <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-amber-400 transition-colors">
                  {actor.name}
                </h3>
                
                {/* Статистика */}
                <p className="text-gray-500 text-xs">
                  <span className="text-green-400">{actor.watched_movies}</span>
                  {' / '}
                  <span>{actor.total_movies}</span>
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
        Показано {visibleActors.length} из {allActors.length} актеров
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
