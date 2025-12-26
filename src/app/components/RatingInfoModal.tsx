// src/app/components/RatingInfoModal.tsx
'use client';

interface RatingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbRating: number;
  cineChanceRating: number | null;
  position: { top: number; left: number } | null;
}

export default function RatingInfoModal({ 
  isOpen, 
  onClose, 
  tmdbRating, 
  cineChanceRating,
  position 
}: RatingInfoModalProps) {
  if (!isOpen || !position) return null;

  return (
    <>
      {/* Backdrop для закрытия при клике вне */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Модальное окно */}
      <div 
        className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 w-[180px]"
        style={{ 
          top: position.top, 
          left: position.left,
          transform: 'translateX(-50%)'
        }}
      >
        {/* TMDB рейтинг */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 relative">
              <img 
                src="/images/logo_mini_lgt_pls_tmdb.png" 
                alt="TMDB" 
                className="object-contain w-full h-full"
              />
            </div>
            <span className="text-xs text-gray-400">TMDB</span>
          </div>
          <span className="text-sm font-bold text-white">{tmdbRating.toFixed(1)}</span>
        </div>
        
        {/* Cine-chance рейтинг */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Cine-chance</span>
          </div>
          <span className="text-sm font-bold text-white">
            {cineChanceRating !== null ? cineChanceRating.toFixed(1) : '—'}
          </span>
        </div>
        
        {/* Стрелочка снизу */}
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
      </div>
    </>
  );
}
