import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui.store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="relative min-h-screen">
      {/* Decorative background blurs - dark mode only */}
      <div className="fixed inset-0 -z-10 overflow-hidden dark:block hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Sidebar />

      {/* Main content */}
      <main
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64',
        )}
      >
        <Header />
        <div className="p-4 sm:p-6 lg:p-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
