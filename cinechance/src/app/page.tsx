"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<any[]>([]);
  const { data: session, status } = useSession();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auth form state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();

  const signInWithEmail = async () => {
    setErrorMessage(null);
    const res = await signIn('credentials', { redirect: false, email: authEmail, password: authPassword });
    if ((res as any)?.error) {
      setErrorMessage((res as any).error);
    } else {
      setShowAuthForm(false);
      router.push('/');
    }
  };

  const signUpWithEmail = async () => {
    setErrorMessage(null);
    try {
      const r = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: authEmail, password: authPassword }) });
      if (!r.ok) {
        let body: any = null;
        try {
          body = await r.json();
        } catch (parseErr) {
          try {
            body = await r.text();
          } catch (_) {
            body = null;
          }
        }
        const msg = (body && (body.message || body.error)) || (typeof body === 'string' && body) || `Sign-up failed (${r.status})`;
        setErrorMessage(msg);
        return;
      }
      // after signup, attempt sign in
      await signInWithEmail();
    } catch (e: any) {
      setErrorMessage(String(e));
    }
  };

  const signOutClient = async () => {
    await signOut({ redirect: false });
  };

  // Поиск
  const search = async () => {
    if (!query.trim()) return setMovies([]);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_) {
        data = text;
      }

      if (!res.ok) {
        const msg = (data && data.message) || `Search API returned ${res.status}`;
        setErrorMessage(msg);
        setMovies([]);
        return;
      }

      setMovies(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Search error', err);
      setErrorMessage(String(err));
      setMovies([]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Хедер */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CineChance
          </h1>
          <div className="mx-6 flex-1">
            <div className="flex w-full max-w-2xl mx-auto">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Поиск фильмов и сериалов..."
                className="flex-1 px-5 py-3.5 bg-gray-900/80 border border-gray-700 rounded-xl text-base outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
          <div>
            {session?.user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">Привет, {session.user.email?.split('@')[0]}</span>
                <button
                  onClick={signOutClient}
                  className="px-5 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowAuthForm((s) => !s)}
                  className="px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-gray-200 transition"
                >
                  Вход
                </button>

                {showAuthForm && (
                  <div className="absolute right-0 mt-2 w-72 p-4 bg-white text-black rounded-lg shadow-lg z-50">
                    <div className="mb-2 text-sm font-medium">{authMode === 'login' ? 'Войти' : 'Регистрация'}</div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full mb-2 px-3 py-2 border rounded"
                    />
                    <input
                      type="password"
                      placeholder="Пароль"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full mb-3 px-3 py-2 border rounded"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { authMode === 'login' ? signInWithEmail() : signUpWithEmail(); }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded"
                      >
                        {authMode === 'login' ? 'Войти' : 'Создать'}
                      </button>
                      <button
                        onClick={() => setAuthMode((m) => (m === 'login' ? 'signup' : 'login'))}
                        className="px-3 py-2 bg-gray-200 rounded"
                      >
                        {authMode === 'login' ? 'Регистрация' : 'Войти'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">

        {errorMessage && (
          <div className="max-w-2xl mx-auto mt-4 text-center text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
          {movies.map((m) => (
            <div key={m.id} className="group relative rounded-lg overflow-hidden shadow-lg hover:shadow-purple-500/30 transition-all">
              {m.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                  alt={m.title || m.name}
                  className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                  Нет постера
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-2 text-center opacity-0 group-hover:opacity-100 transition">
                <p className="text-xs font-medium line-clamp-2">{m.title || m.name}</p>
                <p className="text-xs text-yellow-400 mt-1">★ {m.vote_average?.toFixed(1)}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}