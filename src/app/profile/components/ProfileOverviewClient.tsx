// src/app/profile/components/ProfileOverviewClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const TermsOfServiceModal = dynamic(() => import('@/app/components/TermsOfServiceModal'), { ssr: false });
import { FileText, Settings, Users, ArrowRight } from 'lucide-react';
import NicknameEditor from './NicknameEditor';
import Loader from '@/app/components/Loader';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  birthDate: Date | null;
  createdAt: Date;
}

export interface ProfileOverviewClientProps {
  userId: string;
}

export default function ProfileOverviewClient({ userId }: ProfileOverviewClientProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [watchListCount, setWatchListCount] = useState(0);
  const [blacklistCount, setBlacklistCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Загружаем данные пользователя клиентски для актуальности
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setErrorDetails([]);

        // Параллельная загрузка всех данных
        const [profileResponse, watchlistResponse, blacklistResponse] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/watchlist/count'),
          fetch('/api/user/blacklist/count'),
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

        if (watchlistResponse.ok) {
          const data = await watchlistResponse.json();
          setWatchListCount(data.count || 0);
        } else {
          const errorText = await watchlistResponse.text().catch(() => 'Unknown error');
          errors.push(`Watchlist: ${watchlistResponse.status}`);
          console.error('Watchlist API error:', watchlistResponse.status, errorText);
        }

        if (blacklistResponse.ok) {
          const data = await blacklistResponse.json();
          setBlacklistCount(data.count || 0);
        } else {
          const errorText = await blacklistResponse.text().catch(() => 'Unknown error');
          errors.push(`Blacklist: ${blacklistResponse.status}`);
          console.error('Blacklist API error:', blacklistResponse.status, errorText);
        }

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

      {/* Статистика - ВСЕГДА в одну строку (2 колонки) */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm mb-1">Фильмов в списке</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{watchListCount}</p>
        </div>
        <div className="bg-gray-900 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm mb-1">Скрыто фильмов</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{blacklistCount}</p>
        </div>
      </div>

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
