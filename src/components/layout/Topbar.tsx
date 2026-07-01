import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, PanelLeft, Search, UserRound } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatTimeAgo } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import type { SystemAlert } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusText } from '@/components/shared/StatusText';

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const { data: unread } = useQuery({
    queryKey: ['alerts', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/alerts/unread-count'),
    refetchInterval: 15_000,
  });
  const { data: latest } = useQuery({
    queryKey: ['alerts', 'latest'],
    queryFn: () => api.get<SystemAlert[]>('/alerts/latest'),
    refetchInterval: 30_000,
  });

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      void navigate({ to: '/login' });
    },
  });

  const initials = user?.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <PanelLeft className="size-5" />
      </Button>

      <button
        onClick={onOpenSearch}
        className="flex h-11 w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground transition-colors hover:border-ring/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search merchant, transaction, user...</span>
        <kbd className="rounded-md border border-border bg-card-elevated px-1.5 py-0.5 text-[11px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-5" />
              {(unread?.count ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unread?.count}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <DropdownMenuLabel>Latest alerts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(latest ?? []).map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex flex-col items-start gap-0.5 py-2.5"
                onClick={() => void navigate({ to: '/alerts' })}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <StatusText status={alert.severity} withDot className="text-xs" />
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(alert.at)}</span>
                </span>
                <span className="text-sm font-medium text-foreground">{alert.title}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {alert.description}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-sm font-medium text-info"
              onClick={() => void navigate({ to: '/alerts' })}
            >
              View all alerts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-card">
              <Avatar className="size-9">
                <AvatarFallback className="bg-card-elevated text-sm font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-semibold text-foreground">{user?.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ''}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p>{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
              <UserRound className="size-4" /> Profile & settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => logout.mutate()}>
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
