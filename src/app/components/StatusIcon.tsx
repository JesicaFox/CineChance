// src/app/components/StatusIcon.tsx
import { Check, Plus, X } from 'lucide-react';

type StatusType = 'none' | 'want' | 'watched' | 'dropped';

interface StatusIconProps {
  status: StatusType;
  className?: string;
}

export default function StatusIcon({ status, className = '' }: StatusIconProps) {
  const baseClasses = 'absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10';
  
  switch (status) {
    case 'want':
      return (
        <div className={`${baseClasses} bg-white`}>
          <Plus className="w-4 h-4 text-blue-500" />
        </div>
      );
    case 'watched':
      return (
        <div className={`${baseClasses} bg-green-500`}>
          <Check className="w-4 h-4 text-white" />
        </div>
      );
    case 'dropped':
      return (
        <div className={`${baseClasses} bg-red-500`}>
          <X className="w-4 h-4 text-white" />
        </div>
      );
    case 'none':
    default:
      // Пустой угол - ничего не отображаем
      return null;
  }
}