'use client';

import Link from 'next/link';
import { useSession, signOut } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthModal from './AuthModal';
import Loader from './Loader';
import { logger } from '@/lib/logger';
import { CloseIcon } from './Icons';

type SidebarProps = {
  isOpen: boolean;
  toggle: () => void;
};

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const router = useRouter();

  const isLoading = status === "loading";

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      // Use client-side redirect for stability
      await signOut({ redirect: false });
      router.push('/');
    } catch (err) {
      logger.error('Logout failed', { error: err });
      try { router.push('/'); } catch {}
    } finally {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) toggle();
    }
  };

  // ID администратора для доступа к панели управления
  const ADMIN_USER_ID = 'cmkbc7sn2000104k3xd3zyf2a';
  const isAdmin = session?.user?.id === ADMIN_USER_ID;

  // Базовые пункты меню для всех пользователей
  const baseMenuItems: Array<[string, string, boolean?]> = [
    ['/', 'Главная'],
  ];

  // Дополнительные пункты меню только для авторизованных пользователей
  const authMenuItems: Array<[string, string, boolean?]> = [
    ['/my-movies', 'Мои фильмы'],
    ['/recommendations', 'Что посмотреть'],
  ];

  // Пункт меню админ-панели только для администратора
  const adminMenuItems: Array<[string, string, boolean]> = isAdmin 
    ? [['/admin', 'Управление', true]] 
    : [];

  // Объединяем меню в зависимости от статуса авторизации
  const menuItems = session?.user 
    ? [...baseMenuItems, ...authMenuItems, ...adminMenuItems]
    : baseMenuItems;

  return (
    <>
      {isOpen && (
        <div
          onClick={toggle}
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="p-4 border-b border-gray-800 flex justify-end lg:hidden">
          <button
            onClick={toggle}
            className="text-white text-2xl hover:text-purple-500 transition"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Пользователь */}
        <div className="p-6 border-b border-gray-800">
          {isLoading ? (
            <div className="text-center">
              <Loader size="small" />
            </div>
          ) : session?.user ? (
            <div className="flex flex-col items-center">
              <Link
                href="/profile"
                onClick={() => window.innerWidth < 1024 && toggle()}
                className="flex flex-col items-center no-underline"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h3 className="text-white font-medium text-center text-sm sm:text-base">
                  {session.user.name || session.user.email}
                </h3>
              </Link>

              <Link
                href="/profile"
                onClick={() => window.innerWidth < 1024 && toggle()}
                className="text-gray-400 text-sm hover:text-white mt-2"
              >
                Профиль
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 text-2xl mb-3 mx-auto">
                👤
              </div>
              <p className="text-gray-400">Войдите для доступа к профилю</p>
            </div>
          )}
        </div>

        {/* Навигация */}
        <nav className="flex-1 px-6 py-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const href = item[0];
              const label = item[1];
              const isAdminItem = item[2] === true;
              
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => window.innerWidth < 1024 && toggle()}
                    className={`flex items-center gap-3 py-3 px-4 rounded-lg transition ${
                      isAdminItem
                        ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 hover:text-purple-300'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {isAdminItem && (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    )}
                    <span className="font-medium">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Аутентификация */}
        <div className="p-6 border-t border-gray-800">
          {isLoading ? (
            <div className="h-10 flex items-center justify-center">
              <Loader size="small" />
            </div>
          ) : session?.user ? (
            <>
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-medium hover:brightness-110 transition mb-3"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleLogin}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:brightness-110 transition"
              >
                Войти
              </button>

            </>
          )}
        </div>
      </aside>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
