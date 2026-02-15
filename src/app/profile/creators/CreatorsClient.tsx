'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clapperboard } from 'lucide-react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import '@/app/profile/components/AchievementCards.css';

interface CreatorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  job_types: ('director' | 'producer' | 'writer')[];
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
  creator_score: number;
}

interface CreatorsClientProps {
  userId: string;
}

const TOP_CREATORS_COUNT = 50;
const DISPLAY_COUNT = 50;

function CreatorCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[2/3] rounded-lg bg-gray-800 border border-gray-700" />
      <div className="mt-2 h-4 bg-gray-800 rounded w-3/4" />
      <div className="mt-1 h-3 bg-gray-900 rounded w-1/2" />
    </div>
  );
}

function PageSkeleton() {
  const skeletonCount = 12;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function CreatorsClient({ userId }: CreatorsClientProps) {
  const [creators, setCreators] = useState<CreatorAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`/api/user/achiev_creators?limit=${TOP_CREATORS_COUNT}&singleLoad=true`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        setCreators(data.creators || []);
        setProgress(100);
        
        setTimeout(() => setLoading(false), 300);
        
      } catch (err) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        let errorMessage = 'Не удалось загрузить создателей. Попробуйте позже.';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Загрузка занимает слишком много времени. У вас много просмотренных фильмов, поэтому требуется больше времени. Попробуйте обновить страницу.';
          } else if (err.message.includes('API Error')) {
            errorMessage = 'Ошибка сервера при загрузке создателей. Попробуйте позже.';
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Проблемы с соединением. Проверьте интернет-соединение.';
          }
        }
        
        setError(errorMessage);
        setProgress(100);
        setLoading(false);
      }
    };

    fetchCreators();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [userId]);

  const getProgressMessage = () => {
    if (progress < 20) return '🎬 Собираем информацию о создателях...';
    if (progress < 40) return '📊 Анализируем фильмографии...';
    if (progress < 60) return '⭐ Формируем рейтинги...';
    if (progress < 80) return '🎭 Готовим списки лучших...';
    if (progress < 95) return '📸 Загружаем фотографии...';
    return '✨ Почти готово...';
  };

  const getProgressSubtext = () => {
    if (progress < 20) return 'Изучаем ваши предпочтения в кино';
    if (progress < 40) return 'Считаем просмотренные фильмы каждого создателя';
    if (progress < 60) return 'Упорядочиваем по вашим оценкам';
    if (progress < 80) return 'Отбираем самых любимых кинематографистов';
    if (progress < 95) return 'Подготавливаем постеры для отображения';
    return 'Скоро покажем результат!';
  };

  const handleImageLoad = useCallback((creatorId: number) => {
    setLoadedImages(prev => new Set(prev).add(creatorId));
  }, []);

  const getImagePriority = (index: number) => {
    return index < 12;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
        
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-full max-w-xs">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs text-center">{Math.round(progress)}%</p>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-gray-500 text-sm mb-2">
              {getProgressMessage()}
            </p>
            <p className="text-gray-600 text-xs">
              {getProgressSubtext()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center py-10">
          У вас пока нет любимых создателей
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Любимые создатели</h2>
        <p className="text-gray-400 text-sm">
          Показано {creators.length} создателей
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {creators.map((creator, index) => {
          const progress = creator.progress_percent || 0;
          
          let grayscale, saturate;
          
          if (progress <= 25) {
            grayscale = 100 - (progress * 0.4);
            saturate = 0.1 + (progress * 0.02);
          } else if (progress <= 50) {
            grayscale = 90 - ((progress - 25) * 1.6);
            saturate = 0.6 + ((progress - 25) * 0.016);
          } else if (progress <= 75) {
            grayscale = 50 - ((progress - 50) * 1.2);
            saturate = 1.0;
          } else if (progress <= 90) {
            grayscale = 20 - ((progress - 75) * 0.8);
            saturate = 1.0;
          } else {
            grayscale = Math.max(0, 10 - ((progress - 90) * 1));
            saturate = 1.0;
          }
          
          grayscale = Math.max(0, Math.min(100, grayscale));
          saturate = Math.max(0.1, Math.min(2.5, saturate));
          
          const isImageLoaded = loadedImages.has(creator.id);
          
          return (
            <Link
              key={`${creator.id}-${index}`}
              href={`/person/${creator.id}`}
              className="group relative"
            >
              <div className="relative">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-blue-500/50 transition-all relative">
                  {creator.profile_path ? (
                    <div className="w-full h-full relative">
                      <ImageWithProxy
                        src={`https://image.tmdb.org/t/p/w342${creator.profile_path}`}
                        alt={creator.name}
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
                        onLoad={() => handleImageLoad(creator.id)}
                      />
                      
                      {!isImageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                          <Clapperboard className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Clapperboard className="w-10 h-10" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${progress}%`,
                        opacity: progress === 0 ? 0.3 : 1
                      }}
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                    {progress}%
                  </div>
                </div>
                
                <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-blue-400 transition-colors">
                  {creator.name}
                </h3>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-gray-500 text-xs">
                    <span className="text-green-400">{creator.watched_movies}</span>
                    {' / '}
                    <span>{creator.total_movies}</span>
                    {' фильмов'}
                  </p>
                  {creator.average_rating !== null && (
                    <span className="text-blue-400 text-xs flex items-center gap-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {creator.average_rating}
                    </span>
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
