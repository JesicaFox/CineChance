// src/app/not-found.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        {/* Error Code */}
        <div className="text-6xl font-bold text-red-500 mb-4">ERR-404</div>
        
        {/* Main Message */}
        <h1 className="text-2xl font-semibold text-white mb-2">
          Страница не найдена
        </h1>
        
        {/* User-friendly description */}
        <p className="text-gray-400 mb-8">
          Запрошенная страница не существует или была перемещена.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            На главную
          </Link>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Назад
          </button>
        </div>

        {/* Technical Details - for developers */}
        <details className="text-left bg-gray-900 rounded-lg p-4 border border-gray-800">
          <summary className="text-gray-500 text-sm cursor-pointer hover:text-gray-400">
            Технические детали
          </summary>
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs font-mono">
            <div className="text-gray-400 mb-1">Error Code: ERR-404</div>
            <div className="text-gray-500">Page: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
          </div>
        </details>
      </div>
    </div>
  );
}
