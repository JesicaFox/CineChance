// src/app/components/RatingInfoModal.tsx
'use client';

import { useEffect, useRef } from 'react';

interface RatingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  tmdbRating: number;
  tmdbVoteCount: number;
  cineChanceRating: number | null;
  cineChanceVoteCount: number;
  position: { top: number; left: number } | null;
  isMobile: boolean;
}

export default function RatingInfoModal({ 
  isOpen, 
  onClose, 
  onMouseEnter,
  onMouseLeave,
  tmdbRating,
  tmdbVoteCount, 
  cineChanceRating,
  cineChanceVoteCount,
  position,
  isMobile 
}: RatingInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Обработчик для закрытия при клике вне попапа (для мобильных)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen && isMobile) {
      // Используем mousedown вместо touchstart, чтобы избежать конфликтов
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isMobile, onClose]);

  if (!isOpen || !position) return null;

  // Определяем, с какой стороны показывать стрелку
  // Проверяем, с какой стороны экрана находится попап
  const viewportWidth = window.innerWidth;
  const isRightSide = position.left > viewportWidth / 2;
  
  // Ограничиваем позиционирование, чтобы попап не выходил за границы экрана
  const popupWidth = 140;
  const popupHeight = 80;
  const margin = 10;
  
  let adjustedLeft = position.left;
  let adjustedTop = position.top;
  
  // Проверяем границы по горизонтали
  if (adjustedLeft < margin) {
    adjustedLeft = margin;
  } else if (adjustedLeft + popupWidth > viewportWidth - margin) {
    adjustedLeft = viewportWidth - popupWidth - margin;
  }
  
  // Проверяем границы по вертикали
  if (adjustedTop < margin) {
    adjustedTop = margin;
  } else if (adjustedTop + popupHeight > window.innerHeight - margin) {
    adjustedTop = window.innerHeight - popupHeight - margin;
  }

  return (
    <>
      {/* Модальное окно */}
      <div 
        ref={modalRef}
        className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2.5 w-[140px]"
        style={{ 
          top: `${adjustedTop}px`,
          left: `${adjustedLeft}px`
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* TMDB рейтинг */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-5 h-5 relative">
            <img 
              src="/images/TMDB.png" 
              alt="TMDB" 
              className="object-contain w-full h-full"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-white">{tmdbRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({tmdbVoteCount})</span>
          </div>
        </div>
        
        {/* Cine-chance рейтинг */}
        <div className="flex items-center justify-between">
          <div className="w-5 h-5 relative">
            <img 
              src="/images/logo_mini_lgt.png" 
              alt="Cine-chance" 
              className="object-contain w-full h-full"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-white">
              {cineChanceRating !== null ? cineChanceRating.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-gray-500">({cineChanceVoteCount})</span>
          </div>
        </div>
        
        {/* Стрелочка сбоку */}
        <div 
          className={`absolute top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-gray-900 ${
            isRightSide 
              ? '-right-1 border-r border-t border-gray-700 rotate-45' 
              : '-left-1 border-l border-b border-gray-700 -rotate-45'
          }`}
          style={{
            [isRightSide ? 'right' : 'left']: '-6px'
          }}
        />
      </div>
    </>
  );
}