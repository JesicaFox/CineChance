// src/app/profile/components/ProfileOverviewClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const TermsOfServiceModal = dynamic(() => import('@/app/components/TermsOfServiceModal'), { ssr: false });
import { FileText, Settings, Users, ArrowRight, Eye, Clock, Star, TrendingUp, Monitor, Tv, Film } from 'lucide-react';
import NicknameEditor from './NicknameEditor';
import Loader from '@/app/components/Loader';
import '@/app/profile/components/AchievementCards.css';

interface UserStats {
  total: {
    watched: number;
    wantToWatch: number;
    dropped: number;
    hidden: number;
  };
  typeBreakdown: {
    movie: number;
    tv: number;
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
}

interface ActorAchievement {
  id: number;
  name: string;
  profile_path: string | null;
  watched_movies: number;
  total_movies: number;
  progress_percent: number;
  average_rating: number | null;
}

interface ProfileOverviewClientProps {
  userId: string;
}

export default function ProfileOverviewClient({ userId }: ProfileOverviewClientProps) {
  const [userData, setUserData] = useState<UserStatsData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [collections, setCollections] = useState<CollectionAchievement[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [actors, setActors] = useState<ActorAchievement[]>([]);
  const [actorsLoading, setActorsLoading] = useState(true);

  // Загружаем данные пользователя клиентски для актуальности
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setErrorDetails([]);

        // Параллельная загрузка всех данных
        const [profileResponse, statsResponse, collectionsResponse, actorsResponse] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/user/stats'),
          fetch('/api/user/achiev_collection'),
          fetch('/api/user/achiev_actors'),
        ]);

        let hasError = false;
        let errors: string[] = [];

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          if (data.user) {
            setUserData({
              id: userId,
              name: data.user.name,
              email: data.user.email,
              birthDate: data.user.birthDate ? new Date(data.user.birthDate) : null,
              createdAt: new Date(data.user.createdAt),
            });
          }
        } else {
          hasError = true;
          const errorText = await profileResponse.text().catch(() => 'Unknown error');
          errors.push(`Профиль: ${profileResponse.status} - ${errorText}`);
          console.error('Profile API error:', profileResponse.status, errorText);
        }

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setStats({
            total: {
              watched: data.total?.watched || 0,
              wantToWatch: data.total?.wantToWatch || 0,
              dropped: data.total?.dropped || 0,
              hidden: data.total?.hidden || 0,
            },
            typeBreakdown: {
              movie: data.typeBreakdown?.movie || 0,
              tv: data.typeBreakdown?.tv || 0,
              anime: data.typeBreakdown?.anime || 0,
            },
            averageRating: data.averageRating || null,
            ratedCount: data.ratedCount || 0,
          });
        } else {
          const errorText = await statsResponse.text().catch(() => 'Unknown error');
          errors.push(`Stats: ${statsResponse.status}`);
          console.error('Stats API error:', statsResponse.status, errorText);
        }

        if (collectionsResponse.ok) {
          const data = await collectionsResponse.json();
          console.log('Collections API response:', data);
          setCollections(Array.isArray(data) ? data.slice(0, 10) : []);
        } else {
          console.error('Collections API error:', collectionsResponse.status);
        }
        setCollectionsLoading(false);

        if (actorsResponse.ok) {
          const data = await actorsResponse.json();
          console.log('Actors API response:', data);
          setActors(Array.isArray(data) ? data.slice(0, 5) : []);
        } else {
          console.error('Actors API error:', actorsResponse.status);
        }
        setActorsLoading(false);

        setErrorDetails(errors);

        // Если произошла ошибка и данных нет, пробуем повторить через 3 секунды
        if (hasError && !userData && retryCount < 3) {
          console.warn(`Profile data failed to load, will retry (attempt ${retryCount + 1}/3)...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            fetchUserData();
          }, 3000);
        }
      } catch (error) {
        console.error('Failed to fetch user data', error);
        setErrorDetails(['Ошибка сети: ' + (error instanceof Error ? error.message : 'Unknown error')]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, retryCount]);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 px-4 sm:px-0">
        <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800">
          <Loader text="Загрузка профиля..." />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="space-y-4 md:space-y-6 px-4 sm:px-0">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-300 font-medium mb-2">Не удалось загрузить данные профиля</p>
          
          {errorDetails.length > 0 && (
            <div className="mt-3 space-y-1">
              {errorDetails.map((error, index) => (
                <p key={index} className="text-red-400 text-sm font-mono">
                  {error}
                </p>
              ))}
            </div>
          )}
          
          <button
            onClick={() => {
              setRetryCount(0);
              setErrorDetails([]);
            }}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition"
          >
            Повторить загрузку
          </button>
        </div>
      </div>
    );
  }

  const userEmail = userData.email || '';
  const formattedBirthDate = userData.birthDate 
    ? format(userData.birthDate, isMobile ? 'dd.MM.yyyy' : 'dd MMMM yyyy', { locale: ru })
    : null;

  const handleNicknameChange = (newName: string | null) => {
    setUserData(prev => prev ? { ...prev, name: newName } : null);
  };

  return (
    <div className="space-y-4 md:space-y-6 px-4 sm:px-0">
      {/* Информация о пользователе */}
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
          {/* Всего просмотрено */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-green-400" />
              <p className="text-gray-400 text-xs md:text-sm">Просмотрено</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {stats?.total.watched || 0}
            </p>
          </div>

          {/* Всего отложено */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <p className="text-gray-400 text-xs md:text-sm">Отложено</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {stats?.total.wantToWatch || 0}
            </p>
          </div>

          {/* Всего брошено */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 text-red-400 text-xs font-bold">×</span>
              <p className="text-gray-400 text-xs md:text-sm">Брошено</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {stats?.total.dropped || 0}
            </p>
          </div>

          {/* Всего заблокировано */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-4 text-gray-500 text-xs font-bold">⛔</span>
              <p className="text-gray-400 text-xs md:text-sm">Заблокировано</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {stats?.total.hidden || 0}
            </p>
          </div>
        </div>

        {/* Вторая строка: Типы контента и Средняя оценка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Соотношение типов контента */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="w-4 h-4 text-purple-400" />
              <p className="text-gray-400 text-xs md:text-sm">Типы контента</p>
            </div>
            <div className="space-y-3">
              {/* Фильмы */}
              <div className="flex items-center gap-3">
                <Film className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 text-sm">Фильмы</span>
                    <span className="text-white font-medium">{stats?.typeBreakdown.movie || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stats && stats.total.watched > 0 
                          ? (stats.typeBreakdown.movie / stats.total.watched) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Сериалы */}
              <div className="flex items-center gap-3">
                <Tv className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 text-sm">Сериалы</span>
                    <span className="text-white font-medium">{stats?.typeBreakdown.tv || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stats && stats.total.watched > 0 
                          ? (stats.typeBreakdown.tv / stats.total.watched) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Аниме */}
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-purple-400 text-sm font-bold">あ</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 text-sm">Аниме</span>
                    <span className="text-white font-medium">{stats?.typeBreakdown.anime || 0}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stats && stats.total.watched > 0 
                          ? (stats.typeBreakdown.anime / stats.total.watched) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Средняя оценка */}
          <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <p className="text-gray-400 text-xs md:text-sm">Средняя оценка</p>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl md:text-5xl font-bold text-white">
                {stats?.averageRating?.toFixed(1) || '-'}
              </span>
              <div className="flex-1 pb-1">
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <Star 
                      key={star}
                      className={`w-4 h-4 ${
                        (stats?.averageRating || 0) >= star 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-xs">
                  {stats?.ratedCount || 0} оценённых
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Кинофраншизы */}
      {collections.length > 0 && (
        <div className="space-y-4">
          {/* Заголовок секции */}
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Кинофраншизы</h2>
          </div>

          {/* Постеры коллекций - горизонтальный ряд */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {collections
              .sort((a, b) => b.progress_percent - a.progress_percent)
              .map((collection) => {
                // Рассчитываем grayscale и saturate на основе прогресса
                const grayscaleValue = 100 - collection.progress_percent;
                const saturateValue = collection.progress_percent;
                
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
                      <p className="text-gray-500 text-xs">
                        {collection.watched_movies} / {collection.total_movies} фильмов
                      </p>
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
      )}

      {/* Любимые актеры */}
      {actors.length > 0 && (
        <div className="space-y-4">
          {/* Заголовок секции */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Любимые актеры</h2>
          </div>

          {/* Постеры актеров - горизонтальный ряд */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {actors
              .sort((a, b) => b.watched_movies - a.watched_movies)
              .map((actor) => {
                // Используем progress_percent из API
                const progressPercent = actor.progress_percent || 0;
                // Рассчитываем grayscale и saturate на основе прогресса
                const grayscaleValue = 100 - progressPercent;
                const saturateValue = progressPercent;
                
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
                          <img
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt={actor.name}
                            className="w-full h-full object-cover transition-all duration-300 group-hover:grayscale-0 group-hover:saturate-100 achievement-poster"
                            style={{ 
                              filter: `grayscale(${grayscaleValue}%) saturate(${saturateValue}%)`
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Users className="w-8 h-8" />
                          </div>
                        )}
                        
                        {/* Прогресс просмотра */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                          <div 
                            className="h-full bg-amber-500"
                            style={{ width: `${progressPercent}%` }}
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
                      <p className="text-gray-500 text-xs">
                        {actor.watched_movies} / {actor.total_movies} фильмов
                      </p>
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
      )}

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