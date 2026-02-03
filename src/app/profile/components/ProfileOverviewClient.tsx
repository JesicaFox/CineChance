// src/app/profile/components/ProfileOverviewClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import ImageWithProxy from '@/app/components/ImageWithProxy';
import Image from 'next/image';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const TermsOfServiceModal = dynamic(() => import('@/app/components/TermsOfServiceModal'), { ssr: false });
import { FileText, Settings, Users, ArrowRight, Clock, Star, TrendingUp, Monitor, Tv, Film, CheckIcon, PlusIcon, XIcon, BanIcon, Smile, Clock as ClockIcon, EyeOff as EyeOffIcon, PieChart as PieChartIcon, Star as StarIcon } from 'lucide-react';
import NicknameEditor from './NicknameEditor';
import Loader from '@/app/components/Loader';
import '@/app/profile/components/AchievementCards.css';

interface UserStats {
  total: {
    watched: number;
    wantToWatch: number;
    dropped: number;
    hidden: number;
    totalForPercentage: number;
  };
  typeBreakdown: {
    movie: number;
    tv: number;
    cartoon: number;
    anime: number;
  };
  averageRating: number | null;
  ratedCount: number;
}

interface UserStatsData {
  id: string;
  name: string | null;
  email: string | null;
  birthDate: Date | null;
  createdAt: Date;
}

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

interface ActorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  rewatched_movies: number;
  dropped_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
  actor_score: number;
}

interface ProfileOverviewClientProps {
  userId: string;
}

// Skeleton для информации о пользователе
function UserInfoSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800 animate-pulse">
      <div className="h-5 w-32 bg-gray-700 rounded mb-4"></div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-700 rounded-full flex-shrink-0"></div>
        <div className="flex-1 w-full min-w-0 space-y-2">
          <div className="h-5 w-48 bg-gray-700 rounded"></div>
          <div className="h-4 w-64 bg-gray-800 rounded"></div>
          <div className="h-4 w-32 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton для карточки статистики
function StatsCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="h-8 w-16 bg-gray-700 rounded"></div>
    </div>
  );
}

// Skeleton для прогресс-бара типов контента
function TypeBreakdownSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
                <div className="h-4 w-8 bg-gray-700 rounded"></div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gray-700 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton для средней оценки
function AverageRatingSkeleton() {
  return (
    <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-4 h-4 bg-gray-700 rounded"></div>
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
      </div>
      <div className="flex items-end gap-3">
        <div className="h-10 w-16 bg-gray-700 rounded"></div>
        <div className="flex-1 pb-1">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="w-4 h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-3 w-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton для горизонтального списка карточек (коллекции/актеры) с индикатором загрузки
function HorizontalListSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
          <span className="text-xs">Загрузка...</span>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex-shrink-0 w-28 sm:w-36">
            <div className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
            <div className="mt-2 h-4 w-20 bg-gray-800 rounded animate-pulse"></div>
            <div className="mt-1 h-3 w-16 bg-gray-900 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileOverviewClient({ userId }: ProfileOverviewClientProps) {
  const [userData, setUserData] = useState<UserStatsData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Отдельные состояния загрузки для каждого блока
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [basicStatsLoading, setBasicStatsLoading] = useState(true);
  const [typeBreakdownLoading, setTypeBreakdownLoading] = useState(true);
  const [averageRatingLoading, setAverageRatingLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionAchievement[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [actors, setActors] = useState<ActorAchievement[]>([]);
  const [actorsLoading, setActorsLoading] = useState(true);

  // Загружаем данные пользователя (быстрый запрос)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserData({
              id: userId,
              name: data.user.name,
              email: data.user.email,
              birthDate: data.user.birthDate ? new Date(data.user.birthDate) : null,
              createdAt: new Date(data.user.createdAt),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setUserDataLoading(false);
      }
    };
    
    // Небольшая задержка для избежания rate limiting
    const timer = setTimeout(fetchUserData, 50);
    return () => clearTimeout(timer);
  }, [userId]);

  // Последовательная загрузка данных для лучшего UX
  useEffect(() => {
    const loadDataSequentially = async () => {
      try {
        // Этап 1: Быстро загружаем статистику с последовательным отображением
        setStatsLoading(true);
        setBasicStatsLoading(true);
        setTypeBreakdownLoading(true);
        setAverageRatingLoading(true);
        
        const statsRes = await fetch('/api/user/stats');
        
        if (statsRes.ok) {
          const data = await statsRes.json();
          
          // Сначала отображаем базовую статистику
          setStats({
            total: {
              watched: data.total?.watched || 0,
              wantToWatch: data.total?.wantToWatch || 0,
              dropped: data.total?.dropped || 0,
              hidden: data.total?.hidden || 0,
              totalForPercentage: data.total?.totalForPercentage || 0,
            },
            typeBreakdown: {
              movie: 0,
              tv: 0,
              cartoon: 0,
              anime: 0,
            },
            averageRating: null,
            ratedCount: 0,
          });
          setBasicStatsLoading(false);
          
          // Небольшая задержка для визуального эффекта
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Затем отображаем breakdown по типам
          setStats(prev => prev ? ({
            ...prev,
            typeBreakdown: {
              movie: data.typeBreakdown?.movie || 0,
              tv: data.typeBreakdown?.tv || 0,
              cartoon: data.typeBreakdown?.cartoon || 0,
              anime: data.typeBreakdown?.anime || 0,
            },
          }) : null);
          setTypeBreakdownLoading(false);
          
          // Еще одна небольшая задержка
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // В конце отображаем среднюю оценку
          setStats(prev => prev ? ({
            ...prev,
            averageRating: data.averageRating || null,
            ratedCount: data.ratedCount || 0,
          }) : null);
          setAverageRatingLoading(false);
        } else {
          // Если запрос не удался, все равно завершаем загрузку
          setBasicStatsLoading(false);
          setTypeBreakdownLoading(false);
          setAverageRatingLoading(false);
        }
        setStatsLoading(false);

        // Этап 2: Загружаем коллекции (параллельно с актерами)
        setCollectionsLoading(true);
        const collectionsRes = await fetch('/api/user/achiev_collection?limit=50&singleLoad=true');
        
        if (collectionsRes.ok) {
          const data = await collectionsRes.json();
          setCollections(data.collections ? data.collections.slice(0, 5) : []);
        }
        setCollectionsLoading(false);

        // Этап 3: Загружаем актеров
        setActorsLoading(true);
        const actorsRes = await fetch('/api/user/achiev_actors?limit=50&singleLoad=true');
        
        if (actorsRes.ok) {
          const data = await actorsRes.json();
          setActors(data.actors ? data.actors.slice(0, 5) : []);
        }
        setActorsLoading(false);

      } catch (error) {
        console.error('Failed to load profile data:', error);
        // В случае ошибки все равно завершаем загрузку
        setStatsLoading(false);
        setBasicStatsLoading(false);
        setTypeBreakdownLoading(false);
        setAverageRatingLoading(false);
        setCollectionsLoading(false);
        setActorsLoading(false);
      }
    };

    loadDataSequentially();
  }, []);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const userEmail = userData?.email || '';
  const formattedBirthDate = userData?.birthDate 
    ? format(userData.birthDate, isMobile ? 'dd.MM.yyyy' : 'dd MMMM yyyy', { locale: ru })
    : null;

  const handleNicknameChange = (newName: string | null) => {
    setUserData(prev => prev ? { ...prev, name: newName } : null);
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 sm:px-0">
      {/* Информация о пользователе */}
      {userDataLoading ? (
        <UserInfoSkeleton />
      ) : userData ? (
        <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800">
          <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Информация</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl md:text-2xl font-bold flex-shrink-0">
              {userData.name?.charAt(0) || userData.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 w-full min-w-0 space-y-1">
              <NicknameEditor 
                initialName={userData.name || ''} 
                onNicknameChange={handleNicknameChange}
              />
              <p className="text-gray-400 text-sm md:text-base truncate" title={userEmail}>
                {userEmail}
              </p>
              <p className="text-gray-500 text-xs md:text-sm">
                Дата рождения: <span className="text-gray-300">{formattedBirthDate || '-'}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Настройки параметров аккаунта */}
      <Link 
        href="/profile/settings"
        className="block bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800 hover:border-gray-700 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm md:text-base">Настройки параметров аккаунта</p>
            <p className="text-gray-500 text-xs md:text-sm">Управление настройками профиля и рекомендаций</p>
          </div>
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Статистика профиля - Дашборд */}
      <div className="space-y-4">
        {/* Заголовок секции */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Статистика</h2>
        </div>

        {/* Основные метрики - сетка 2x2 на мобильных, 4 колонки на десктопе */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {basicStatsLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : stats?.total ? (
            <>
              {/* Всего просмотрено */}
              <Link
                href="/my-movies?tab=watched"
                className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 hover:border-green-500/50 hover:bg-gray-800/80 transition cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 bg-green-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-gray-400 text-xs md:text-sm">Просмотрено</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white pl-10">
                  {stats.total.watched}
                </p>
              </Link>

              {/* Всего отложено */}
              <Link
                href="/my-movies?tab=want_to_watch"
                className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/80 transition cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 bg-blue-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <ClockIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-gray-400 text-xs md:text-sm">Отложено</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white pl-10">
                  {stats.total.wantToWatch}
                </p>
              </Link>

              {/* Брошено */}
              <Link
                href="/my-movies?tab=dropped"
                className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800 hover:border-red-500/50 hover:bg-gray-800/80 transition cursor-pointer block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 bg-red-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <XIcon className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-gray-400 text-xs md:text-sm">Брошено</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white pl-10">
                  {stats.total.dropped}
                </p>
              </Link>

              {/* Скрыто */}
              <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 bg-gray-400/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <EyeOffIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-xs md:text-sm">Скрыто</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-white pl-10">
                  {stats.total.hidden}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Вторая строка: Типы контента и Средняя оценка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Типы контента */}
          {typeBreakdownLoading ? (
            <TypeBreakdownSkeleton />
          ) : stats?.typeBreakdown ? (
            <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium text-white">Типы контента</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">🎬 Фильмы</span>
                  <span className="text-white text-xs font-medium">{stats.typeBreakdown.movie}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">📺 Сериалы</span>
                  <span className="text-white text-xs font-medium">{stats.typeBreakdown.tv}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">🎨 Мультфильмы</span>
                  <span className="text-white text-xs font-medium">{stats.typeBreakdown.cartoon}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">🌸 Аниме</span>
                  <span className="text-white text-xs font-medium">{stats.typeBreakdown.anime}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Средняя оценка */}
          {averageRatingLoading ? (
            <AverageRatingSkeleton />
          ) : stats?.averageRating !== null ? (
            <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-medium text-white">Средняя оценка</h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-white">
                  {stats?.averageRating?.toFixed(1) || '—'}
                </span>
                <span className="text-gray-400 text-xs">/ 10</span>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Оценено фильмов: {stats?.ratedCount || 0}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Кинофраншизы */}
      {collectionsLoading ? (
        <HorizontalListSkeleton title="Кинофраншизы" />
      ) : collections.length > 0 ? (
        <div className="space-y-4">
          {/* Заголовок секции */}
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Кинофраншизы</h2>
          </div>

          {/* Постеры коллекций - горизонтальный ряд */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {collections
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
                // Исправленная формула контраста с правильной насыщенностью
                const progress = collection.progress_percent || 0;
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
                saturate = Math.max(0.1, Math.min(1.0, saturate));
                
                return (
                  <Link
                    key={collection.id}
                    href={`/collection/${collection.id}`}
                    className="flex-shrink-0 group relative"
                  >
                    <div className="relative w-28 sm:w-36">
                      {/* Постер */}
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-purple-500/50 transition-all relative">
                        {collection.poster_path ? (
                          <div className="relative w-full h-full">
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
                            <Film className="w-8 h-8" />
                          </div>
                        )}
                        
                        {/* Прогресс просмотра */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                          <div 
                            className="h-full bg-purple-500"
                            style={{ width: `${collection.progress_percent}%` }}
                          />
                        </div>
                        
                        {/* Процент просмотра */}
                        <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                          {collection.progress_percent}%
                        </div>
                      </div>
                      
                      {/* Название */}
                      <p className="mt-2 text-gray-300 text-xs sm:text-sm truncate group-hover:text-purple-400 transition-colors">
                        {collection.name.replace(/\s*\(Коллекция\)\s*$/i, '')}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs">
                          {collection.watched_movies} / {collection.total_movies} фильмов
                        </p>
                        {collection.average_rating !== null && (
                          <div className="flex items-center bg-gray-800/50 rounded text-xs flex-shrink-0">
                            <div className="w-4 h-4 relative mx-0.5">
                              <Image 
                                src="/images/logo_mini_lgt.png" 
                                alt="CineChance Logo" 
                                fill 
                                className="object-contain" 
                              />
                            </div>
                            <span className="text-gray-200 font-medium pr-1.5">
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

          {/* Кнопка показать все */}
          <Link
            href="/profile/collections"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 hover:border-gray-700 transition text-gray-400 hover:text-white text-sm"
          >
            <span>Показать все коллекции</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : null}

      {/* Любимые актеры */}
      {actorsLoading ? (
        <HorizontalListSkeleton title="Любимые актеры" />
      ) : actors.length > 0 ? (
        <div className="space-y-4">
          {/* Заголовок секции */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Любимые актеры</h2>
          </div>

          {/* Постеры актеров - горизонтальный ряд */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
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
              .map((actor) => {
                // Исправленная формула контраста с правильной насыщенностью
                const progress = actor.progress_percent || 0;
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
                saturate = Math.max(0.1, Math.min(1.0, saturate));
                
                return (
                  <Link
                    key={actor.id}
                    href={`/person/${actor.id}`}
                    className="flex-shrink-0 group relative"
                  >
                    <div className="relative w-28 sm:w-36">
                      {/* Постер актера */}
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 border border-gray-700 group-hover:border-amber-500/50 transition-all relative">
                        {actor.profile_path ? (
                          <div className="w-full h-full relative">
                            <ImageWithProxy
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                              alt={actor.name}
                              fill
                              className="object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster"
                              sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 144px"
                              style={{ 
                                filter: `grayscale(${grayscale}%) saturate(${saturate})`
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Users className="w-8 h-8" />
                          </div>
                        )}
                        
                        {/* Прогресс просмотра */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                          <div 
                            className="h-full bg-amber-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        
                        {/* Количество фильмов */}
                        <div className="absolute top-2 right-2 bg-amber-600/90 text-white text-xs font-medium px-2 py-1 rounded">
                          {actor.progress_percent}%
                        </div>
                      </div>
                      
                      {/* Имя актера */}
                      <p className="mt-2 text-gray-300 text-xs sm:text-sm truncate group-hover:text-amber-400 transition-colors">
                        {actor.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-xs">
                          {actor.watched_movies} / {actor.total_movies} фильмов
                        </p>
                        {actor.average_rating !== null && (
                          <div className="flex items-center bg-gray-800/50 rounded text-xs flex-shrink-0">
                            <div className="w-4 h-4 relative mx-0.5">
                              <Image 
                                src="/images/logo_mini_lgt.png" 
                                alt="CineChance Logo" 
                                fill 
                                className="object-contain" 
                              />
                            </div>
                            <span className="text-gray-200 font-medium pr-1.5">
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

          {/* Кнопка показать всех актеров */}
          <Link
            href="/profile/actors"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 hover:bg-gray-800 rounded-lg border border-gray-800 hover:border-gray-700 transition text-gray-400 hover:text-white text-sm"
          >
            <span>Показать всех актеров</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : null}

      {/* Приглашение друзей */}
      <Link 
        href="/profile/invite"
        className="block bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800 hover:border-purple-700/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm md:text-base">Приглашение друзей</p>
            <p className="text-gray-500 text-xs md:text-sm">Приглашайте друзей присоединиться к CineChance</p>
          </div>
          <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {/* Сбор данных и Пользовательское соглашение */}
      <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-white font-medium text-sm md:text-base">Сбор данных</p>
            </div>
            <p className="text-gray-500 text-xs md:text-sm">
              Разрешён сбор событий взаимодействия
            </p>
          </div>
          
          <button
            onClick={() => setShowTermsModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition w-full sm:w-auto"
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Открыть соглашение</span>
          </button>
        </div>
        
        {/* Дополнительная информация на мобильных */}
        <div className="mt-3 pt-3 border-t border-gray-800 sm:hidden">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-400 text-xs">
              Мы собираем только данные о взаимодействиях с сервисом для улучшения рекомендаций
            </p>
          </div>
        </div>
      </div>

      {/* Модальное окно пользовательского соглашения */}
      <TermsOfServiceModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
}
