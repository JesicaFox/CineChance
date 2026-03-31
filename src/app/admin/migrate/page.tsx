// src/app/admin/migrate/page.tsx
'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate-media-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Migration failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Media Type Migration</h1>
        <p className="text-slate-300 mb-8">
          Update existing watch list items with corrected media types (movie, tv, anime, cartoon)
        </p>

        <div className="bg-slate-700 rounded-lg p-8 shadow-xl">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">What this does:</h2>
            <ul className="text-slate-300 space-y-2">
              <li>✓ Fetches all watch list items from the database</li>
              <li>✓ Checks TMDB for media details (genres, language)</li>
              <li>✓ Updates media type to anime/cartoon if detected</li>
              <li>✓ Cleans up related history records (RatingHistory, RewatchLog)</li>
              <li>✓ Preserves main watch list data</li>
            </ul>
          </div>

          <div className="bg-yellow-900 border border-yellow-700 rounded p-4 mb-8">
            <p className="text-yellow-200">
              <strong>⚠️ Warning:</strong> This will make API calls to TMDB for each item in your watch list.
              Make sure TMDB_API_KEY is configured.
            </p>
          </div>

          <button
            onClick={runMigration}
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
              isLoading
                ? 'bg-slate-600 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLoading ? '⏳ Running migration...' : '▶️ Run Migration'}
          </button>

          {result && (
            <div className="mt-8 bg-green-900 border border-green-700 rounded p-6">
              <h3 className="text-xl font-semibold text-green-200 mb-4">✅ Migration Complete!</h3>
              <div className="text-green-100 space-y-2">
                <p>Total records: <strong>{result.stats.total}</strong></p>
                <p>Updated: <strong className="text-green-300">{result.stats.updated}</strong></p>
                <p>Skipped: <strong>{result.stats.skipped}</strong></p>
                {result.stats.errors > 0 && (
                  <p>Errors: <strong className="text-red-300">{result.stats.errors}</strong></p>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 bg-red-900 rounded p-4">
                  <p className="text-red-200 font-semibold mb-2">Errors:</p>
                  <ul className="text-red-100 text-sm space-y-1">
                    {result.errors.slice(0, 5).map((err: any, i: number) => (
                      <li key={i}>
                        <strong>{err.id}:</strong> {err.error}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-900 border border-red-700 rounded p-6">
              <h3 className="text-xl font-semibold text-red-200 mb-2">❌ Error</h3>
              <p className="text-red-100">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-slate-400 text-sm">
          <p>
            This operation is safe - it only updates the mediaType field based on TMDB data.
            All other data remains unchanged.
          </p>
        </div>
      </div>
    </div>
  );
}
