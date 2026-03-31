'use client';

import { useState, useEffect } from 'react';
import { Users, Database, TrendingUp, Calendar, RefreshCw, UserCheck, Trash2 } from 'lucide-react';

interface SimilarityStats {
  totalScores: number;
  uniqueUsers: number;
  averageMatch: number;
  lastComputed: string | null;
  schedulerLastRun: string | null;
}

interface ExtendedStats extends SimilarityStats {
  totalUsers: number;
  activeUsers: number;
  orphansCleaned?: number;
}

export default function SimilarityMetrics() {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [similarityRes, usersRes] = await Promise.all([
        fetch('/api/similarity/stats'),
        fetch('/api/admin/users/stats'),
      ]);
      
      const similarityData = await similarityRes.json();
      
      let totalUsers = 0;
      let activeUsers = 0;
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        totalUsers = usersData.totalUsers || 0;
        activeUsers = usersData.activeUsers || 0;
      }
      
      if (similarityData.success) {
        setStats({
          ...similarityData.stats,
          totalUsers,
          activeUsers,
        });
      } else {
        setError(similarityData.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphans = async () => {
    setCleaningUp(true);
    try {
      const res = await fetch('/api/similarity/cleanup', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.deleted > 0) {
        setStats(prev => prev ? { ...prev, orphansCleaned: data.deleted } : null);
        // Refresh stats after cleanup
        await fetchStats();
      }
    } catch (err) {
      console.error('Cleanup failed:', err);
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <div className="text-red-400 text-center py-4">
          Ошибка: {error}
        </div>
        <button
          onClick={fetchStats}
          className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  const daysSinceScheduler = getDaysSince(stats?.schedulerLastRun || null);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Метрики Similarity</h3>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Обновить"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Scores */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Всего scores</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.totalScores?.toLocaleString() || 0}
          </p>
        </div>

        {/* Unique Users with Similarity */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">С близостью</p>
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {stats?.uniqueUsers || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            из {stats?.totalUsers || 0} юзеров
          </p>
        </div>

        {/* Total Users */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Всего юзеров</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.totalUsers || 0}
          </p>
        </div>

        {/* Average Match */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <p className="text-gray-400 text-sm">Ср. match</p>
          </div>
          <p className="text-2xl font-bold text-white">
            {((stats?.averageMatch || 0) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Last Computed Info */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-sm">Последний scheduler:</span>
          <span className="text-white text-sm">
            {formatDate(stats?.schedulerLastRun || null)}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-sm">Последний computed:</span>
          <span className="text-white text-sm">
            {formatDate(stats?.lastComputed || null)}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-sm">Scheduler назад:</span>
          <span className={`text-sm font-medium ${
            daysSinceScheduler !== null && daysSinceScheduler > 7 
              ? 'text-yellow-400' 
              : 'text-green-400'
          }`}>
            {daysSinceScheduler !== null ? `${daysSinceScheduler} дн.` : '-'}
          </span>
        </div>
        
        {/* Cleanup orphans button */}
        <button
          onClick={cleanupOrphans}
          disabled={cleaningUp}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
        >
          {cleaningUp ? (
            <>
              <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-gray-400 text-sm">Очистка...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 text-orange-400" />
              <span className="text-gray-300 text-sm">Очистить orphan scores</span>
            </>
          )}
        </button>
        
        {stats?.orphansCleaned !== undefined && stats.orphansCleaned > 0 && (
          <div className="p-3 bg-orange-400/10 border border-orange-400/30 rounded-lg">
            <span className="text-orange-400 text-sm">
              Удалено {stats.orphansCleaned} orphan scores
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
