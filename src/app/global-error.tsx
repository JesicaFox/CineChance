// src/app/global-error.tsx
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to our logger
    logger.error('Global error boundary', {
      error: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {/* Error Code */}
        <div className="text-6xl font-bold text-red-500 mb-4">ERR-500</div>
        
        {/* Main Message */}
        <h1 className="text-2xl font-semibold text-white mb-2">
          Внутренняя ошибка сервера
        </h1>
        
        {/* User-friendly description */}
        <p className="text-gray-400 mb-8">
          Что-то пошло не так на сервере. Попробуйте обновить страницу.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            На главную
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Назад
          </button>
          <button
            onClick={reset}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors font-medium"
          >
            Попробовать снова
          </button>
        </div>

        {/* Technical Details - for developers */}
        <details className="text-left bg-gray-900 rounded-lg p-4 border border-gray-800">
          <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
            Технические детали
          </summary>
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs font-mono">
            <div className="text-gray-400 mb-1">Error Code: ERR-500</div>
            {error.digest && (
              <div className="text-gray-500 mb-1">Digest: {error.digest}</div>
            )}
            <div className="text-red-400 mt-2 break-words">
              {error.message || 'Unknown error'}
            </div>
            {process.env.NODE_ENV === 'development' && error.stack && (
              <pre className="text-gray-600 mt-2 overflow-x-auto text-[10px]">
                {error.stack}
              </pre>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
