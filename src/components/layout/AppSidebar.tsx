import { Link, useRouterState } from '@tanstack/react-router';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Percent,
  ScrollText,
  Settings,
  ShieldAlert,
  Store,
  TabletSmartphone,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const NAV_SECTIONS: {
  label: string;
  items: { to: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: 'Operations',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/merchants', label: 'Merchants', icon: Store },
      { to: '/terminals', label: 'Palm Terminals', icon: TabletSmartphone },
      { to: '/transactions', label: 'Transactions', icon: CreditCard },
      { to: '/failed-transactions', label: 'Failed Monitoring', icon: ShieldAlert },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/commissions', label: 'Commissions', icon: Percent },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/users', label: 'Users & Roles', icon: Users },
      { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
      { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { to: '/system-logs', label: 'System Logs', icon: Activity },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: unread } = useQuery({
    queryKey: ['alerts', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/alerts/unread-count'),
    refetchInterval: 15_000,
  });

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[280px]',
      )}
    >
      <div className={cn('flex h-20 items-center px-6', collapsed && 'justify-center px-0')}>
        <Link to="/" className="block">
          <p className="text-lg font-extrabold tracking-tight text-foreground">
            {collapsed ? 'MP' : 'MULTIPAY'}
          </p>
          {!collapsed && (
            <p className="text-xs text-muted-foreground">Palm Pay Administration</p>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.to);
                const showBadge = item.to === '/alerts' && (unread?.count ?? 0) > 0;
                const link = (
                  <Link
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && showBadge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-white">
                        {unread?.count}
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-6 py-4">
          <p className="text-[11px] text-muted-foreground/60">
            Multipay Systems · v0.1.0
          </p>
        </div>
      )}
    </aside>
  );
}
