// src/app/profile/actors/ActorsClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users } from 'lucide-react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Loader from '@/app/components/Loader';
import ProgressBar from '@/app/components/ProgressBar';
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

const TOP_ACTORS_COUNT = 50;

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
  const [actors, setActors] = useState<ActorAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка актеров с прогресс-баром
  useEffect(() => {
    const fetchActors = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Запускаем анимацию прогресса
        progressIntervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev < 70) {
              return Math.min(prev + Math.random() * 3 + 1, 70);
            } else if (prev < 85) {
              return Math.min(prev + Math.random() * 1 + 0.5, 85);
            } else {
              return prev;
            }
          });
        }, 200);

        const response = await fetch(`/api/user/achiev_actors?limit=${TOP_ACTORS_COUNT}&singleLoad=true`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch actors');
        }

        const data = await response.json();
        
        // Останавливаем анимацию прогресса
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        setActors(data.actors || []);
        setProgress(100);
        
        // Небольшая задержка для визуала
        setTimeout(() => setLoading(false), 300);
        
      } catch (err) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        console.error('Failed to fetch actors:', err);
        setError('Не удалось загрузить актеров');
        setProgress(100);
        setLoading(false);
      }
    };

    fetchActors();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [userId]);

  // Обработчик загрузки изображения
  const handleImageLoad = useCallback((actorId: number) => {
    setLoadedImages(prev => new Set(prev).add(actorId));
  }, []);

  // Определяем приоритет загрузки
  const getImagePriority = (index: number) => {
    return index < 12; // Первые 12 изображений с приоритетом
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Skeleton заголовка */}
        <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
        
        {/* Прогресс-бар */}
        <div className="flex items-center justify-center min-h-[50vh]">
          <ProgressBar 
            progress={progress} 
            message="Подготовка списка актеров..." 
            color="amber"
          />
        </div>
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
    <div className="space-y-4">
      {/* Заголовок с количеством */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Любимые актеры</h2>
        <p className="text-gray-400 text-sm">
          Показано {actors.length} актеров
        </p>
      </div>

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
            // Гибкая формула цветности с нелинейной прогрессией
            const progress = actor.progress_percent || 0;
            
            // Нелинейная формула для лучшего UX распределения
            let grayscale, saturate;
            
            if (progress <= 10) {
              grayscale = 100 - (progress * 0.5); // 100% -> 95%
              saturate = 0.1 + (progress * 0.01); // 0.1 -> 0.2
            } else if (progress <= 30) {
              grayscale = 95 - ((progress - 10) * 1.25); // 95% -> 70%
              saturate = 0.2 + ((progress - 10) * 0.015); // 0.2 -> 0.5
            } else if (progress <= 60) {
              grayscale = 70 - ((progress - 30) * 1.33); // 70% -> 30%
              saturate = 0.5 + ((progress - 30) * 0.02); // 0.5 -> 1.1
            } else if (progress <= 90) {
              grayscale = 30 - ((progress - 60) * 0.67); // 30% -> 10%
              saturate = 1.1 + ((progress - 60) * 0.03); // 1.1 -> 2.0
            } else {
              grayscale = 10 - ((progress - 90) * 1); // 10% -> 0%
              saturate = 2.0 + ((progress - 90) * 0.02); // 2.0 -> 2.4
            }
            
            // Ограничиваем значения
            grayscale = Math.max(0, Math.min(100, grayscale));
            saturate = Math.max(0.1, Math.min(2.5, saturate));
            
            const isImageLoaded = loadedImages.has(actor.id);
            
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
                          className={`object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster ${
                            isImageLoaded ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ 
                            filter: `grayscale(${grayscale}%) saturate(${saturate})`
                          }}
                          priority={getImagePriority(index)}
                          quality={80}
                          onLoad={() => handleImageLoad(actor.id)}
                        />
                        
                        {/* Placeholder пока изображение загружается */}
                        {!isImageLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <Users className="w-10 h-10 text-gray-600" />
                          </div>
                        )}
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
    </div>
  );
}
