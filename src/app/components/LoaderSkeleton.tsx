// src/app/components/LoaderSkeleton.tsx
'use client';

import Loader from './Loader';
import MovieCardSkeleton from './MovieCardSkeleton';

interface LoaderSkeletonProps {
  variant?: 'grid' | 'horizontal' | 'full';
  text?: string;
  skeletonCount?: number;
}

export default function LoaderSkeleton({
  variant = 'grid',
  text = 'Загрузка...',
  skeletonCount = 6,
}: LoaderSkeletonProps) {
  if (variant === 'horizontal') {
    return (
      <div className="py-8">
        <div className="container mx-auto px-4">
          {/* Заголовок скелетон */}
          <div className="h-8 w-48 bg-gray-800 rounded skeleton-shimmer mb-6" />

          {/* Лоадер */}
          <div className="flex items-center justify-center mb-6">
            <Loader size="medium" />
          </div>

          {/* Горизонтальные карточки */}
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {[...Array(skeletonCount)].map((_, i) => (
              <MovieCardSkeleton key={i} variant="horizontal" />
            ))}
          </div>

          {/* Текст загрузки */}
          {text && (
            <p className="text-gray-400 text-sm text-center mt-4">{text}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center py-12">
        <Loader size="large" />
        {text && <p className="text-gray-400 text-sm mt-4">{text}</p>}
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="mt-4">
      {/* Фильтр скелетон */}
      <div className="h-12 bg-gray-800/50 rounded-lg mb-6 skeleton-shimmer" />

      {/* Лоадер */}
      <div className="flex items-center justify-center mb-6">
        <Loader size="medium" />
      </div>

      {/* Сетка карточек */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        {[...Array(skeletonCount)].map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>

      {/* Текст загрузки */}
      {text && (
        <p className="text-gray-400 text-sm text-center mt-4">{text}</p>
      )}
    </div>
  );
}
