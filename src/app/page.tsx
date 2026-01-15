// src/app/page.tsx
import HorizontalMovieGridServer from './components/HorizontalMovieGridServer';
import { revalidate } from '@/lib/cache';

export const revalidateTime = revalidate(3600); // ISR: обновление страницы раз в час (3600 секунд)

// Теги для инвалидации кэша
export const cacheTagsList = ['trending-movies', 'home-page'];

export default async function Home() {
  return (
    <div className="w-full max-w-full">
      <HorizontalMovieGridServer />
      
      <div className="mt-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-6">Что посмотреть дальше?</h2>
        <p className="text-gray-400">
          Скоро здесь появятся персонализированные рекомендации и новые релизы.
        </p>
      </div>
      
      <div className="h-12"></div>
    </div>
  );
}