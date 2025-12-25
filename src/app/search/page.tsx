// src/app/search/page.tsx
import { searchMedia } from '@/lib/tmdb';
import MovieCard from '../components/MovieCard';
import Link from 'next/link';
import { prisma } from '@/lib/prisma'; // Импортируем Prisma
import { getServerSession } from 'next-auth'; // Импортируем сессию
import { authOptions } from '@/auth'; // Импортируем опции аутентификации

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  
  // 1. Получаем список tmdbId из черного списка (если пользователь авторизован)
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  
  let blacklistedIds = new Set<number>();
  
  if (userId) {
    try {
      const blacklist = await prisma.blacklist.findMany({
        where: { userId },
        select: { tmdbId: true }
      });
      blacklistedIds = new Set(blacklist.map(b => b.tmdbId));
    } catch (error) {
      console.error("Failed to fetch blacklist", error);
    }
  }

  // 2. Получаем медиа из TMDB
  const media = query ? await searchMedia(query) : [];

  // 3. Фильтруем: убираем фильмы, которые есть в черном списке
  const filteredMedia = media.filter(item => !blacklistedIds.has(item.id));

  return (
    <div className="min-h-screen bg-gray-950 py-4">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Компактный заголовок */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-base sm:text-lg font-medium text-white inline">
            {query ? `Поиск: "${query}"` : 'Поиск фильмов и сериалов'}
          </h1>
          {query && filteredMedia.length > 0 && (
            <span className="text-gray-400 text-sm ml-2">
              ({filteredMedia.length} {filteredMedia.length === 1 ? 'результат' : filteredMedia.length < 5 ? 'результата' : 'результатов'})
            </span>
          )}
        </div>

        {!query ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Введите запрос в поисковую строку выше</p>
            <Link href="/" className="text-blue-400 hover:underline mt-3 inline-block text-xs">
              ← На главную
            </Link>
          </div>
        ) : filteredMedia.length > 0 ? (
          // Адаптивная сетка с надежными отступами
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {filteredMedia.map((item) => (
              <div 
                key={`${item.media_type}_${item.id}`} 
                className="w-full min-w-0 p-1"
              >
                <MovieCard movie={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-2">
              {media.length === 0 ? 'Ничего не найдено' : 'Все результаты скрыты вашим списком'}
            </p>
            <p className="text-gray-500 text-xs mb-4">
              {media.length === 0 ? 'Попробуйте другой запрос' : 'Проверьте раздел "Скрытые"'}
            </p>
            <Link href="/" className="text-blue-400 hover:underline inline-block text-xs">
              ← На главную
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}