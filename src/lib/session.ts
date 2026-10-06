import { useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { onUnauthorized } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

const IDLE_TIMEOUT_MS = 15 * 60_000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Ends the session — and returns to login — after 15 minutes of inactivity
 * or when any API request comes back 401 (expired / invalid token).
 */
export function useSessionGuard(): void {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const expire = useCallback(
    (description: string) => {
      const { token, clearSession } = useAuthStore.getState();
      if (!token) return;
      clearSession({ expired: true });
      queryClient.clear();
      toast.warning('Session expired', { description });
      void navigate({ to: '/login' });
    },
    [navigate, queryClient],
  );

  useEffect(() => onUnauthorized(() => expire('Please sign in again.')), [expire]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => expire('You were logged out after a period of inactivity.'),
        IDLE_TIMEOUT_MS,
      );
    };
    reset();
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, reset, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, reset);
    };
  }, [expire]);
}
