'use client';

import { SessionProvider } from "next-auth/react";
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <SessionProvider
      session={undefined} // В NextAuth 4 нужно передать undefined
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar isOpen={isSidebarOpen} toggle={toggleSidebar} />
        
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
        }`}>
          <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          
          <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}