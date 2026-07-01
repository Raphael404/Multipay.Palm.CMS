import { useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/** Auto-logout after N minutes of inactivity (default 15, configurable in Settings). */
export function useIdleLogout(): void {
  const navigate = useNavigate();
  const timeoutMinutes = useUiStore((s) => s.sessionTimeoutMinutes);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => {
          const { token, clearSession } = useAuthStore.getState();
          if (!token) return;
          clearSession({ expired: true });
          toast.warning('Session expired', {
            description: 'You were logged out after a period of inactivity.',
          });
          void navigate({ to: '/login' });
        },
        timeoutMinutes * 60_000,
      );
    };
    reset();
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, reset, { passive: true });
    return () => {
      clearTimeout(timer.current);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, reset);
    };
  }, [navigate, timeoutMinutes]);
}
