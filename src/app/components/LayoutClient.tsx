'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthModal from './AuthModal';
import Providers from '../providers';

// Компонент для обработки параметров URL (обёрнут в Suspense)
function AuthParamsHandler({ onAuthRequired }: { onAuthRequired: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth = searchParams.get('auth');
    if (auth === 'required' || auth === 'login') {
      onAuthRequired();
      // Очищаем URL параметр после открытия модального окна
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, onAuthRequired]);

  return null;
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        }`}>
          <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          
          <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Обработчик параметров авторизации */}
      <Suspense fallback={null}>
        <AuthParamsHandler onAuthRequired={() => setIsAuthModalOpen(true)} />
      </Suspense>

      {/* Модальное окно авторизации */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </Providers>
  );
}
