'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StatsData {
  success: boolean;
  tables: Record<string, {
    total: number;
    oldestDate: string | null;
    newestDate: string | null;
  }>;
  cleanupStatus: {
    healthy: boolean;
    message: string;
    details: Record<string, {
      status: 'ok' | 'warning' | 'critical';
      message: string;
    }>;
  };
  retentionPolicy: Record<string, number>;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Нет данных';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function StatusBadge({ status }: { status: 'ok' | 'warning' | 'critical' }) {
  const config = {
    ok: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
    critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  };
  
  const { icon: Icon, color, bg, border } = config[status];
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg} ${border} border`}>
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>
        {status === 'ok' ? 'OK' : status === 'warning' ? 'Внимание' : 'Критично'}
      </span>
    </div>
  );
}

function TableStatsRow({ 
  name, 
  data, 
  retentionDays 
}: { 
  name: string; 
  data: { total: number; oldestDate: string | null; newestDate: string | null };
  retentionDays: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-800/30 rounded-lg">
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{name}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          {formatNumber(data.total)} записей · с {formatDate(data.oldestDate)} по {formatDate(data.newestDate)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-gray-500 text-xs">Хранение: {retentionDays} дн.</p>
      </div>
    </div>
  );
}

export default function RecommendationStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/recommendations/stats');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Обновляем каждые 5 минут
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <h3 className="text-lg font-semibold text-white">Мониторинг системы</h3>
        </div>
        <p className="text-gray-400 text-sm">Загрузка статистики...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-red-800/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Мониторинг системы</h3>
        </div>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const overallStatus = stats.cleanupStatus.healthy 
    ? { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' }
    : { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' };

  const { icon: StatusIcon, color, bg, border } = overallStatus;

  const tableNames: Record<string, string> = {
    RecommendationEvent: 'События рекомендаций',
    IntentSignal: 'Сигналы намерений',
    NegativeFeedback: 'Негативная обратная связь',
    UserSession: 'Сессии пользователей',
    FilterSession: 'Сессии фильтров',
    RecommendationLog: 'Логи рекомендаций',
    PredictionLog: 'ML предсказания',
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      {/* Заголовок и общий статус */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Мониторинг системы</h3>
          <button
            onClick={fetchStats}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg} ${border} border`}>
          <StatusIcon className={`w-4 h-4 ${color}`} />
          <span className={`text-sm font-medium ${color}`}>
            {stats.cleanupStatus.healthy ? 'Все системы работают' : 'Требуется внимание'}
          </span>
        </div>
      </div>

      {/* Статус очистки */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">Статус очистки данных:</p>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(stats.cleanupStatus.details).map(([table, detail]) => (
            <div key={table} className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-300 text-sm">{tableNames[table] || table}</span>
              <StatusBadge status={detail.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Статистика по таблицам */}
      <div className="mb-4">
        <p className="text-gray-400 text-sm mb-3">Объём данных в таблицах:</p>
        <div className="space-y-2">
          {Object.entries(stats.tables).map(([table, data]) => (
            <TableStatsRow
              key={table}
              name={tableNames[table] || table}
              data={data}
              retentionDays={stats.retentionPolicy[table] || 90}
            />
          ))}
        </div>
      </div>

      {/* Время обновления */}
      <p className="text-gray-500 text-xs text-right mt-4">
        Обновлено: {new Date().toLocaleTimeString('ru-RU')}
      </p>
    </div>
  );
}
