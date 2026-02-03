// src/app/components/ProgressBar.tsx
'use client';

import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  message?: string;
  className?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple';
}

export default function ProgressBar({ 
  progress, 
  message = 'Загрузка...', 
  className = '',
  color = 'blue'
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-purple-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Прогресс бар */}
      <div className="w-full max-w-xs">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-150 ease-out`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Текст прогресса */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{message}</span>
          <span className="text-gray-500">({Math.round(progress)}%)</span>
        </div>
      </div>
    </div>
  );
}
