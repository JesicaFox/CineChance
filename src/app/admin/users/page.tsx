import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "../AdminSidebar";
import { Users, Calendar, Mail, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from "next/link";

interface SearchParams {
  page?: string;
  pageSize?: string;
}

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Проверка авторизации
  if (!session || !session.user) {
    redirect("/?auth=required");
  }

  // Проверка доступа только для определённого пользователя
  const ADMIN_USER_ID = 'cmkbc7sn2000104k3xd3zyf2a';
  if (session.user.id !== ADMIN_USER_ID) {
    redirect('/');
  }

  // Параметры пагинации
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || '25', 10)));

  // Загрузка общего количества пользователей для статистики
  const totalUsersCount = await prisma.user.count();

  // Загрузка пользователей с пагинацией
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      emailVerified: true,
      _count: {
        select: {
          watchList: true,
          recommendationLogs: true,
        },
      },
    },
  });

  // Дополнительные статистики (по всем пользователям)
  const verifiedCount = await prisma.user.count({
    where: { emailVerified: { not: null } },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newUsers7DaysCount = await prisma.user.count({
    where: { createdAt: { gt: sevenDaysAgo } },
  });

  // Расчёт пагинации
  const totalPages = Math.ceil(totalUsersCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Генерация номеров страниц для отображения
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Всегда показываем первую страницу
      pages.push(1);

      if (page > 3) {
        pages.push('...');
      }

      // Страницы вокруг текущей
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (page < totalPages - 2) {
        pages.push('...');
      }

      // Всегда показываем последнюю страницу
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // URL для смены страницы
  const getPageUrl = (newPage: number) => {
    const urlParams = new URLSearchParams();
    urlParams.set('page', String(newPage));
    urlParams.set('pageSize', String(pageSize));
    return `/admin/users?${urlParams.toString()}`;
  };

  // URL для смены размера страницы
  const getPageSizeUrl = (newPageSize: number) => {
    const urlParams = new URLSearchParams();
    urlParams.set('page', '1'); // Сброс на первую страницу
    urlParams.set('pageSize', String(newPageSize));
    return `/admin/users?${urlParams.toString()}`;
  };

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* Сайдбар админ-панели */}
      <AdminSidebar />

      {/* Основной контент */}
      <main className="flex-1 p-8 overflow-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Пользователи</h1>
          <p className="text-gray-400">
            Управление пользователями платформы
          </p>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Всего пользователей</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalUsersCount}</p>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Подтверждённых</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{verifiedCount}</p>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">За 7 дней</span>
            </div>
            <p className="text-3xl font-bold text-purple-400">{newUsers7DaysCount}</p>
          </div>
        </div>

        {/* Список пользователей */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Все пользователи</h2>
            
            {/* Селектор размера страницы */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Показывать:</span>
              <select
                className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-purple-500"
                value={pageSize}
                onChange={(e) => {
                  window.location.href = getPageSizeUrl(parseInt(e.target.value, 10));
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Пользователей пока нет</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                      <th className="pb-3 pr-4">Пользователь</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Дата регистрации</th>
                      <th className="pb-3 pr-4">Фильмов</th>
                      <th className="pb-3 pr-4">Рекомендаций</th>
                      <th className="pb-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">
                              {user.name || 'Без имени'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Mail className="w-4 h-4 text-gray-500" />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-gray-400">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-4 pr-4 text-gray-300">
                          {user._count.watchList}
                        </td>
                        <td className="py-4 pr-4 text-gray-300">
                          {user._count.recommendationLogs}
                        </td>
                        <td className="py-4">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                              <Shield className="w-3 h-3" />
                              Подтверждён
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                              Неподтверждён
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                  {/* Информация о записях */}
                  <div className="text-gray-400 text-sm">
                    Показано {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalUsersCount)} из {totalUsersCount}
                  </div>

                  {/* Навигация по страницам */}
                  <div className="flex items-center gap-1">
                    {/* Кнопка "Назад" */}
                    {hasPrevPage ? (
                      <Link
                        href={getPageUrl(page - 1)}
                        className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Назад</span>
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-2 text-gray-600 cursor-not-allowed">
                        <ChevronLeft className="w-4 h-4" />
                        <span>Назад</span>
                      </span>
                    )}

                    {/* Номера страниц */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">...</span>
                        ) : (
                          <Link
                            key={pageNum}
                            href={getPageUrl(pageNum as number)}
                            className={`px-3 py-2 rounded-lg transition ${
                              pageNum === page
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        )
                      ))}
                    </div>

                    {/* Кнопка "Вперёд" */}
                    {hasNextPage ? (
                      <Link
                        href={getPageUrl(page + 1)}
                        className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      >
                        <span>Вперёд</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-2 text-gray-600 cursor-not-allowed">
                        <span>Вперёд</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
