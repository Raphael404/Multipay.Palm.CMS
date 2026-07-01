import { useState } from 'react';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { useIdleLogout } from '@/lib/session';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!useAuthStore.getState().token) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  useIdleLogout();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'pl-[72px]' : 'pl-[280px]',
        )}
      >
        <Topbar onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 space-y-6 p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
