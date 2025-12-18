// src/app/components/ScrollContainer.tsx
'use client';

import { useRef, useState, ReactNode } from 'react';
import './ScrollContainer.css';

interface ScrollContainerProps {
  children: ReactNode;
}

export default function ScrollContainer({ children }: ScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const scrollAmount = 400; // Прокрутка на 400px
    const currentScroll = scrollRef.current.scrollLeft;
    const newScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    scrollRef.current.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
    
    // Обновляем видимость кнопок после прокрутки
    setTimeout(updateButtonVisibility, 300);
  };

  const updateButtonVisibility = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    setShowLeftButton(scrollLeft > 0);
    setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleScroll = () => {
    updateButtonVisibility();
  };

  return (
    <div className="scroll-container">
      {/* Кнопка прокрутки влево */}
      <button 
        className={`scroll-button scroll-button-left ${!showLeftButton ? 'hidden' : ''}`}
        onClick={() => scroll('left')}
        aria-label="Прокрутить влево"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
        </svg>
      </button>
      
      {/* Контейнер с контентом */}
      <div 
        ref={scrollRef}
        className="scroll-content"
        onScroll={handleScroll}
      >
        {children}
      </div>
      
      {/* Кнопка прокрутки вправо */}
      <button 
        className={`scroll-button scroll-button-right ${!showRightButton ? 'hidden' : ''}`}
        onClick={() => scroll('right')}
        aria-label="Прокрутить вправо"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
      
      {/* Градиенты по краям */}
      <div className="scroll-gradient-left"></div>
      <div className="scroll-gradient-right"></div>
    </div>
  );
}