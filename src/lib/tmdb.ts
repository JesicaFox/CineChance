// src/lib/tmdb.ts
export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  overview: string;
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Убедитесь, что ключ загружен (для отладки)
if (!TMDB_API_KEY) {
  console.warn('⚠️ TMDB_API_KEY не найден! Проверьте .env.local');
}

export const fetchTrendingMovies = async (timeWindow: 'day' | 'week' = 'week'): Promise<Movie[]> => {
  try {
    // Формируем URL с API ключом как параметром запроса
    const url = new URL(`${BASE_URL}/trending/movie/${timeWindow}`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');
    
    // Отладочная информация
    console.log('🔍 TMDB_API_KEY:', TMDB_API_KEY ? 'Загружен' : 'Отсутствует');
    console.log('🔗 URL запроса:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
      },
      // Отключаем кэш для отладки
      cache: 'no-store',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка TMDB API:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('❌ Сетевая ошибка при запросе к TMDB:', error);
    return [];
  }
};

export const fetchPopularMovies = async (page: number = 1): Promise<Movie[]> => {
  try {
    const url = new URL(`${BASE_URL}/movie/popular`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('language', 'ru-RU');
    url.searchParams.append('page', page.toString());
    
    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка TMDB API (popular):', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('❌ Ошибка при запросе популярных фильмов:', error);
    return [];
  }
};

export const searchMovies = async (query: string, page: number = 1): Promise<Movie[]> => {
  if (!query.trim()) return [];

  try {
    const url = new URL(`${BASE_URL}/search/movie`);
    url.searchParams.append('api_key', TMDB_API_KEY || '');
    url.searchParams.append('query', query.trim());
    url.searchParams.append('language', 'ru-RU');
    url.searchParams.append('page', page.toString());

    const response = await fetch(url.toString(), {
      headers: { 'accept': 'application/json' },
      next: { revalidate: 3600 }, // кэш на час
    });

    if (!response.ok) {
      console.error('Ошибка TMDB search:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Ошибка при поиске фильмов:', error);
    return [];
  }
};