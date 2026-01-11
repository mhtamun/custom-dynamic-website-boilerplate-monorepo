'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import AppFooter from './app-footer';
import AppSidebar from './app-sidebar';
import AppTopbar from './app-topbar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on outside click (mobile) and mask click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isSidebarOpen &&
        !target.closest('[class*="layout-sidebar"]') &&
        !target.closest('button[aria-label="Toggle menu"]')
      ) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('click', handleClickOutside);
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isSidebarOpen]);

  return (
    <div className={cn('min-h-screen', isSidebarOpen && 'layout-mobile-active')}>
      <AppTopbar onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} isMenuOpen={isSidebarOpen} />

      <div
        className={cn(
          'fixed z-[999] overflow-y-auto overflow-x-hidden select-none ',
          'transition-transform duration-200 bg-surface-overlay shadow-layout',
          'layout-sidebar-scrollbar',
          // Desktop: visible sidebar
          'lg:w-[300px] lg:h-[calc(100vh-9rem)] lg:top-28 lg:left-8 lg:rounded-xl lg:p-2',
          // Mobile: hidden sidebar by default
          'w-[280px] h-screen top-0 left-0 translate-x-[-100%] rounded-none p-4 max-w-[85vw]',
          // Mobile active state
          isSidebarOpen && 'translate-x-0 !bg-white',
          // Desktop: always visible
          'lg:translate-x-0',
        )}
      >
        <AppSidebar />
      </div>

      <div
        className={cn(
          'flex flex-col min-h-screen justify-between',
          'pt-28 px-4 pb-8 transition-[margin-left] duration-200',
          'md:px-8 md:pt-28',
          'lg:pr-8 lg:pl-16 lg:pt-28 lg:pb-8',
          // Static layout with sidebar
          'lg:ml-[300px]',
        )}
      >
        <div className="flex-1 w-full max-w-full">{children}</div>
        <AppFooter />
      </div>

      {isSidebarOpen && (
        <div
          className={cn(
            'fixed top-0 left-0 z-[998] w-full h-full',
            'bg-black/50 backdrop-blur-sm',
            'lg:hidden',
          )}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
