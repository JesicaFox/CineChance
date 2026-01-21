// src/app/profile/invite/InviteClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Users, ArrowLeft } from 'lucide-react';
import InviteFunctionality from './InviteFunctionality';

// Временно отключено - раскомментируйте для активации
// const INVITATION_FEATURE_ENABLED = true;
const INVITATION_FEATURE_ENABLED = false;

export default function InviteClient() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Навигация назад */}
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Вернуться к профилю
      </button>

      {/* Заголовок */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Приглашение друзей</h2>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Приглашайте друзей присоединиться к CineChance
        </p>
      </div>

      {/* Цитата */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 relative">
        <div className="flex items-start gap-3">
          <div className="text-4xl text-purple-500 font-serif leading-none">"</div>
          <div className="flex-1">
            <p className="text-gray-300 text-lg font-medium italic leading-relaxed">
              Первое правило Бойцовского клуба: не упоминать о Бойцовском клубе.
            </p>
            <p className="text-right text-gray-500 text-sm mt-4 pr-2">
              — Чак Поланик
            </p>
          </div>
        </div>
      </div>

      {/* Функционал приглашений (отключен) */}
      {!INVITATION_FEATURE_ENABLED && (
        <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800 border-dashed text-center">
          <p className="text-gray-500">
            Функционал приглашений временно отключен
          </p>
        </div>
      )}

      {/* Раскомментируйте для активации: */}
      {/* <InviteFunctionality /> */}
    </div>
  );
}
