'use client';

import { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Cpu,
  Globe
} from 'lucide-react';

interface ApiStats {
  calls: number;
  returns: number;
  accuracy: number;
}

interface AlgorithmStats {
  name: string;
  returns: number;
  accuracy: number;
  lastUsed: string | null;
  healthStatus: 'ok' | 'warning' | 'critical';
}

interface CombinedStatsData {
  success: boolean;
  apiStats: {
    active: ApiStats;
    passive: ApiStats;
  };
  algorithmStats: AlgorithmStats[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatPercent(num: number): string {
  return (num * 100).toFixed(1) + '%';
}

function formatLastUsed(dateStr: string | null): string {
  if (!dateStr) return 'Никогда';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Только что';
  if (diffHours < 24) return `${diffHours}ч назад`;
  if (diffDays < 7) return `${diffDays}д назад`;
  return `${diffDays}д назад`;
}

function ApiRow({ 
  name, 
  stats,
  lastCall 
}: { 
  name: string; 
  stats: ApiStats;
  lastCall?: string | null;
}) {
  const getHealthIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'critical': return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const getHealthLabel = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'Ок';
      case 'warning': return 'Тревога';
      case 'critical': return 'Критично';
    }
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 0.3) return 'text-green-400';
    if (acc >= 0.1) return 'text-yellow-400';
    return 'text-red-400';
  };

  const healthStatus: 'ok' | 'warning' | 'critical' = stats.calls > 0 ? 'ok' : 'critical';

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
      <div className="flex items-center gap-2">
        {getHealthIcon(healthStatus)}
        <div>
          <p className="text-white text-sm">{name}</p>
          <p className="text-gray-400 text-xs">
            {formatNumber(stats.calls)} вызовов · {formatNumber(stats.returns)} возвращено
          </p>
          <p className="text-gray-500 text-xs">
            {lastCall ? formatLastUsed(lastCall) : 'Нет вызовов'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${getAccuracyColor(stats.accuracy)}`}>
          {formatPercent(stats.accuracy)}
        </p>
        <p className="text-gray-500 text-xs">Точности</p>
      </div>
    </div>
  );
}

function AlgorithmRow({ 
  data 
}: { 
  data: AlgorithmStats;
}) {
  const getHealthIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'warning': return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'critical': return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const getHealthLabel = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok': return 'Ок';
      case 'warning': return 'Тревога';
      case 'critical': return 'Критично';
    }
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 0.3) return 'text-green-400';
    if (acc >= 0.1) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg">
      <div className="flex items-center gap-2">
        {getHealthIcon(data.healthStatus)}
        <div>
          <p className="text-white text-sm">{data.name}</p>
          <p className="text-gray-500 text-xs">
            {formatNumber(data.returns)} возвратов · {formatLastUsed(data.lastUsed)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${getAccuracyColor(data.accuracy)}`}>
          {formatPercent(data.accuracy)}
        </p>
        <p className="text-gray-500 text-xs">Точности</p>
      </div>
    </div>
  );
}

export default function AlgorithmPerformanceBlock() {
  const [stats, setStats] = useState<CombinedStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/recommendations/ml-stats');
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      
      if (data.apiStats && data.algorithmStats) {
        setStats({
          success: data.success,
          apiStats: data.apiStats,
          algorithmStats: data.algorithmStats,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          <h3 className="text-lg font-semibold text-white">Производительность алгоритмов</h3>
        </div>
        <p className="text-gray-400 text-sm">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-red-800/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Производительность алгоритмов</h3>
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

  const hasActiveData = stats.apiStats.active.calls > 0;
  const hasPassiveData = stats.apiStats.passive.calls > 0;
  const allHealthy = stats.algorithmStats.every(a => a.healthStatus === 'ok');

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Производительность алгоритмов</h3>
          <button
            onClick={fetchStats}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
        {allHealthy ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-400/10 text-green-400 rounded-full text-xs border border-green-400/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Ок
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/10 text-red-400 rounded-full text-xs border border-red-400/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Есть проблемы
          </span>
        )}
      </div>

      {/* API Level Stats */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3">Уровень API:</p>
        <div className="space-y-2">
          <ApiRow
            name="/api/recommendations/random"
            stats={stats.apiStats.active}
            lastCall={stats.apiStats.active.calls > 0 ? new Date().toISOString() : null}
          />
          <ApiRow
            name="/api/recommendations/patterns"
            stats={stats.apiStats.passive}
            lastCall={stats.apiStats.passive.calls > 0 ? new Date().toISOString() : null}
          />
        </div>
      </div>

      {/* Algorithm Level Stats */}
      <div>
        <p className="text-gray-400 text-sm mb-3">Уровень алгоритмов:</p>
        <div className="space-y-2">
          {stats.algorithmStats
            .sort((a, b) => b.returns - a.returns)
            .map((algo) => (
              <AlgorithmRow key={algo.name} data={algo} />
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
