// src/app/profile/invite/InviteFunctionality.tsx
'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Copy, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Invitation {
  id: string;
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  isValid: boolean;
}

const MAX_INVITATIONS = 1;

export default function InviteFunctionality() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Загрузка списка приглашений
  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/admin');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      logger.error('Error loading invitations', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  // Проверка количества доступных приглашений
  const availableInvitationsCount = invitations.filter(i => !i.usedAt && i.isValid).length;
  const canCreateMore = availableInvitationsCount < MAX_INVITATIONS;

  // Создание приглашения
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canCreateMore) {
      setMessage({ type: 'error', text: `Вы достигли лимита в ${MAX_INVITATIONS} приглашение(й)` });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Приглашение для ${email} создано!` });
        setEmail('');
        loadInvitations();
      } else {
        setMessage({ type: 'error', text: data.error || 'Ошибка создания приглашения' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка соединения с сервером' });
    } finally {
      setIsLoading(false);
    }
  };

  // Копирование ссылки
  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Удаление приглашения
  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить это приглашение?')) return;

    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadInvitations();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Ошибка удаления' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка соединения с сервером' });
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Статус приглашения
  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.usedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
          <Check className="w-3 h-3" />
          Использовано
        </span>
      );
    }
    if (!invitation.isValid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
          <X className="w-3 h-3" />
          Истёк
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
        <Check className="w-3 h-3" />
        Активно
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Сообщение об ошибке/успехе */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>{message.text}</p>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">Использовано приглашений</p>
          <p className="text-2xl font-bold text-white">{availableInvitationsCount} / {MAX_INVITATIONS}</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">Доступно</p>
          <p className={`text-2xl font-bold ${canCreateMore ? 'text-green-400' : 'text-red-400'}`}>
            {MAX_INVITATIONS - availableInvitationsCount}
          </p>
        </div>
      </div>

      {/* Форма создания приглашения */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-purple-400" />
          Создать приглашение
        </h3>

        {!canCreateMore ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">
              Вы использовали все приглашения ({MAX_INVITATIONS}). 
              Новые приглашения станут доступны после истечения срока действия или удаления неиспользованных приглашений.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Создать приглашение
                </>
              )}
            </button>
          </form>
        )}
        <p className="text-gray-500 text-sm mt-2">
          Приглашение будет действительно в течение 7 дней
        </p>
      </div>

      {/* Список приглашений */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Ваши приглашения</h3>

        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>У вас пока нет приглашений</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{invitation.email}</span>
                  {getStatusBadge(invitation)}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Создано: {formatDate(invitation.createdAt)}</span>
                  <span>Истекает: {formatDate(invitation.expiresAt)}</span>
                </div>
                {!invitation.usedAt && invitation.isValid && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => copyInviteLink(invitation.token)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition"
                    >
                      {copiedToken === invitation.token ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Копировать ссылку
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteInvite(invitation.id)}
                      className="px-3 py-2 bg-gray-700 hover:bg-red-900/50 hover:text-red-400 rounded-lg text-gray-300 text-sm transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
