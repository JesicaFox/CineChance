'use client';

import { useState, useRef, useEffect } from 'react';

type HeaderProps = {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
};

export default function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    
    if (searchQuery.trim()) {
      // Переходим на страницу поиска с параметром q
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      // Сворачиваем поиск после выполнения (на мобильных)
      if (window.innerWidth < 768) {
        setIsSearchExpanded(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsSearchExpanded(false);
    }
  };

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded && searchInputRef.current) {
      // Фокус на поле ввода при разворачивании
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const cancelSearch = () => {
    setIsSearchExpanded(false);
    setSearchQuery('');
  };

  // Закрываем поиск при клике вне области на мобильных
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth < 768 && 
          isSearchExpanded && 
          searchInputRef.current &&
          !searchInputRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSearchExpanded]);

  return (
    <header className="h-16 bg-black/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between w-full relative">
      <div className="flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
        
        {/* Логотип и кнопка меню - скрываются при развернутом поиске на мобильных */}
        <div className={`flex items-center gap-4 transition-all duration-300 ${
          isSearchExpanded ? 'md:flex hidden' : 'flex'
        }`}>
          <button 
            onClick={toggleSidebar} 
            className="text-white text-2xl hover:text-purple-500 transition shrink-0"
            aria-label={isSidebarOpen ? "Скрыть меню" : "Показать меню"}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
            CineChance
          </h1>
        </div>

        {/* Поисковая строка */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          
          {/* Десктопная версия поиска (растягивается на всю ширину) */}
          <div className="relative hidden md:flex flex-1 ml-8 mr-4 max-w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск фильмов и сериалов..."
              className="w-full px-5 py-3.5 pr-14 bg-gray-900/80 border border-gray-700 rounded-full text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
            />
            <button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-gray-800/50 transition-all duration-200 group"
              aria-label="Поиск"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>

          {/* Мобильная версия: иконка лупы (сворачивается/разворачивается) */}
          <div className="md:hidden flex items-center">
            
            {/* Кнопка поиска (иконка) - всегда видна на мобильных */}
            {!isSearchExpanded && (
              <button
                onClick={toggleSearch}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-300"
                aria-label="Развернуть поиск"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            )}

            {/* Развернутое поле поиска на мобильных */}
            {isSearchExpanded && (
              <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center px-4">
                <div className="w-full flex items-center gap-3">
                  
                  {/* Поле ввода */}
                  <div className="flex-1 relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Поиск фильмов и сериалов..."
                      className="w-full px-5 py-3.5 pr-12 bg-gray-900/90 border border-gray-700 rounded-full text-white text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
                      autoFocus
                    />
                    
                    {/* Кнопка поиска внутри поля */}
                    <button
                      onClick={handleSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-800/50 transition-all duration-200"
                      aria-label="Выполнить поиск"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400 hover:text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Кнопка закрытия (крестик) вместо "Отмена" */}
                  <button
                    onClick={cancelSearch}
                    className="p-3 rounded-full hover:bg-gray-800/50 transition-all duration-200 shrink-0"
                    aria-label="Закрыть поиск"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-400 hover:text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}