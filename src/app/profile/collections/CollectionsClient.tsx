// src/app/profile/collections/CollectionsClient.tsx
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Image from 'next/image';
import Link from 'next/link';
import { Film } from 'lucide-react';
import Loader from '@/app/components/Loader';
import '@/app/profile/components/AchievementCards.css';
import { logger } from '@/lib/logger';

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

const TOP_COLLECTIONS_COUNT = 50; // Оптимальное количество для балансировки производительности и сортировки
const DISPLAY_COUNT = 50; // Показываем все 50

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

export default function CollectionsClient({ userId }: CollectionsClientProps) {
  const [collections, setCollections] = useState<CollectionAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка коллекций с прогресс-баром
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Запускаем анимацию прогресса с информативными сообщениями
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

        // Добавляем таймаут для предотвращения зависания
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут

        const response = await fetch(`/api/user/achiev_collection?limit=${TOP_COLLECTIONS_COUNT}&singleLoad=true`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          logger.error('API Error', { status: response.status, errorText });
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Останавливаем анимацию прогресса
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        setCollections(data.collections ? data.collections.slice(0, DISPLAY_COUNT) : []);
        setProgress(100);
        
        // Небольшая задержка для визуала
        setTimeout(() => setLoading(false), 300);
        
      } catch (err) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        
        logger.error('Failed to fetch collections', { error: err instanceof Error ? err.message : String(err) });
        
        // Детальная обработка ошибок
        let errorMessage = 'Не удалось загрузить коллекции';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Превышено время ожидания загрузки. Попробуйте обновить страницу.';
          } else if (err.message.includes('API Error')) {
            errorMessage = 'Ошибка сервера при загрузке коллекций. Попробуйте позже.';
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Проблемы с соединением. Проверьте интернет-соединение.';
          }
        }
        
        setError(errorMessage);
        setProgress(100);
        setLoading(false);
      }
    };

    fetchCollections();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [userId]);

  // Получаем информативное сообщение на основе прогресса
  const getProgressMessage = () => {
    if (progress < 20) return '🎬 Собираем информацию о коллекциях...';
    if (progress < 40) return '📊 Анализируем кинофраншизы...';
    if (progress < 60) return '⭐ Формируем рейтинги...';
    if (progress < 80) return '🎭 Готовим списки лучших...';
    if (progress < 95) return '📸 Загружаем постеры...';
    return '✨ Почти готово...';
  };

  const getProgressSubtext = () => {
    if (progress < 20) return 'Изучаем ваши предпочтения в кино';
    if (progress < 40) return 'Считаем просмотренные фильмы каждой франшизы';
    if (progress < 60) return 'Упорядочиваем по вашим оценкам';
    if (progress < 80) return 'Отбираем самые любимые серии';
    if (progress < 95) return 'Подготавливаем постеры для отображения';
    return 'Скоро покажем результат!';
  };

  // Обработчик загрузки изображения
  const handleImageLoad = useCallback((collectionId: number) => {
    setLoadedImages(prev => new Set(prev).add(collectionId));
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
        
        {/* Прогресс-бар с информативными сообщениями */}
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-full max-w-xs">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs text-center">{Math.round(progress)}%</p>
          </div>
          
          {/* Информативные сообщения */}
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

  if (collections.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center py-10">
          У вас пока нет коллекций
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок с количеством */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Кинофраншизы</h2>
        <p className="text-gray-400 text-sm">
          Показано {collections.length} коллекций
        </p>
      </div>

      {/* Сетка коллекций */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {collections
          .map((collection) => {
            // Сбалансированная формула рейтинга коллекции - качество решает!
            const calculateCollectionScore = (collection: CollectionAchievement) => {
              const avgRating = collection.average_rating || 0;
              const watchedMovies = collection.watched_movies || 0;
              const progress = collection.progress_percent || 0;
              
              // Базовый рейтинг качества (0-10) - главный фактор
              const qualityScore = avgRating;
              
              // Минимальный бонус за объем (только для разрешения ничьих)
              // 1 фильм = +0.03, 5 фильмов = +0.08, 10 фильмов = +0.1, 20 фильмов = +0.13
              const volumeBonus = Math.log10(Math.max(1, watchedMovies)) * 0.05;
              
              // Маленький бонус за прогресс (легкая мотивация)
              // 0% = 0, 50% = +0.07, 100% = +0.15
              const progressBonus = (progress / 100) * 0.15;
              
              // Итоговый рейтинг - качество главное!
              const finalScore = qualityScore + volumeBonus + progressBonus;
              
              // Ограничиваем диапазон 0-10
              return Math.max(0, Math.min(10, finalScore));
            };
            
            return {
              ...collection,
              calculated_score: calculateCollectionScore(collection)
            };
          })
          .sort((a, b) => {
            // Сначала по умному рейтингу (desc) - качество решает!
            if (b.calculated_score !== a.calculated_score) {
              return b.calculated_score - a.calculated_score;
            }
            
            // Если умный рейтинг равен, сортируем по средней оценке (desc)
            if (a.average_rating !== null && b.average_rating !== null) {
              if (b.average_rating !== a.average_rating) {
                return b.average_rating - a.average_rating;
              }
            } else if (a.average_rating === null && b.average_rating !== null) {
              return 1;
            } else if (a.average_rating !== null && b.average_rating === null) {
              return -1;
            }
            
            // Если и средние оценки равны, сортируем по прогрессу (desc)
            if (b.progress_percent !== a.progress_percent) {
              return b.progress_percent - a.progress_percent;
            }
            
            // Если и прогресс одинаковый, сортируем по алфавиту (asc)
            return a.name.localeCompare(b.name, 'ru');
          })
          .map((collection, index) => {
          const progress = collection.progress_percent || 0;
          
          // Исправленная формула контраста с правильной насыщенностью
          let grayscale, saturate;
          
          if (progress <= 25) {
            // Очень низкий прогресс - почти полностью бесцветные
            grayscale = 100 - (progress * 0.4); // 100% -> 90%
            saturate = 0.1 + (progress * 0.02); // 0.1 -> 0.6
          } else if (progress <= 50) {
            // Низкий прогресс - заметная бесцветность
            grayscale = 90 - ((progress - 25) * 1.6); // 90% -> 50%
            saturate = 0.6 + ((progress - 25) * 0.016); // 0.6 -> 1.0
          } else if (progress <= 75) {
            // Средний прогресс - умеренная бесцветность (самая заметная разница)
            grayscale = 50 - ((progress - 50) * 1.2); // 50% -> 20%
            saturate = 1.0; // Нормальная насыщенность
          } else if (progress <= 90) {
            // Высокий прогресс - легкая бесцветность
            grayscale = 20 - ((progress - 75) * 0.8); // 20% -> 0%
            saturate = 1.0; // Нормальная насыщенность
          } else {
            // Почти завершено - минимальная бесцветность
            grayscale = Math.max(0, 10 - ((progress - 90) * 1)); // 10% -> 0%
            saturate = 1.0; // Нормальная насыщенность
          }
          
          // Ограничиваем значения
          grayscale = Math.max(0, Math.min(100, grayscale));
          saturate = Math.max(0.1, Math.min(2.5, saturate));
          
          // Отладочная информация
          logger.debug('Collection progress', { name: collection.name, progress, grayscale, saturate });
          
          const isImageLoaded = loadedImages.has(collection.id);
          
          return (
            <Link
              key={collection.id}
              href={`/collection/${collection.id}`}
              className="group relative"
            >
              <div className="relative">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-green-500/50 transition-all relative">
                  {collection.poster_path ? (
                    <div className="w-full h-full relative">
                      <ImageWithProxy
                        src={`https://image.tmdb.org/t/p/w342${collection.poster_path}`}
                        alt={collection.name}
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
                        onLoad={() => handleImageLoad(collection.id)}
                      />
                      
                      {/* Placeholder пока изображение загружается */}
                      {!isImageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                          <Film className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Film className="w-10 h-10" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ 
                        width: `${progress}%`,
                        opacity: progress === 0 ? 0.3 : 1
                      }}
                    />
                  </div>
                  
                  <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                    {progress}%
                  </div>
                </div>
                
                <h3 className="mt-2 text-gray-300 text-sm truncate group-hover:text-green-400 transition-colors">
                  {collection.name}
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
    </div>
  );
}
