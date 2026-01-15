// src/app/search/page.tsx
import SearchClient from './SearchClient';

export const revalidate = 3600; // ISR: обновление страницы раз в час (3600 секунд)
export const dynamicParams = true; // Разрешаем динамические параметры

// Теги для инвалидации кэша
export const cacheTags = ['search-results'];

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';

  // Blacklist данные теперь загружаются на клиенте в SearchClient
  // для обеспечения актуальности при изменениях пользователя

  return (
    <div className="min-h-screen bg-gray-950 py-4">
      <div className="container mx-auto px-3 sm:px-4">
        <h1 className="text-base sm:text-lg font-medium text-white mb-4">
          {query ? `Поиск: "${query}"` : 'Поиск фильмов и сериалов'}
        </h1>

        <SearchClient initialQuery={query} />
      </div>
    </div>
  );
}
