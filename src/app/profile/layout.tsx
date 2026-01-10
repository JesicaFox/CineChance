// src/app/profile/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { User, Settings, Activity } from 'lucide-react';

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/');
  }

  const userInitial = session.user.name?.charAt(0) || session.user.email?.charAt(0).toUpperCase() || 'U';
  const userName = session.user.name || 'Пользователь';
  const userEmail = session.user.email || '';

  const navItems = [
    { href: '/profile', label: 'Обзор', icon: User },
    { href: '/profile/settings', label: 'Настройки', icon: Settings },
    { href: '/profile/monitoring', label: 'Мониторинг', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">
          Профиль
        </h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar навигация */}
          <nav className="md:w-64 flex-shrink-0">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 sticky top-8">
              <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-gray-800">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {userInitial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-white font-medium text-sm truncate">{userName}</p>
                  <p className="text-gray-500 text-xs truncate">{userEmail}</p>
                </div>
              </div>
              
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
          
          {/* Основной контент */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
