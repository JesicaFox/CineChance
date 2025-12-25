// src/app/page.tsx
import HorizontalMovieGridServer from './components/HorizontalMovieGridServer';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export default async function Home() {
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

  return (
    <div className="w-full max-w-full">
      {/* Передаем список ID в компонент */}
      <HorizontalMovieGridServer blacklistedIds={blacklistedIds} />
      
      {/* Дополнительные блоки можно добавить позже */}
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