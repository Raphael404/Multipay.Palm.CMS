import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionUser } from '@/types';
import { TOKEN_KEY } from '@/lib/api-client';
import { hasPermission, type Permission } from '@/lib/permissions';

interface AuthState {
  user: SessionUser | null;
  token: string | null;
  sessionExpired: boolean;
  setSession: (token: string, user: SessionUser) => void;
  clearSession: (opts?: { expired?: boolean }) => void;
  can: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      sessionExpired: false,
      setSession: (token, user) => {
        // mirrored to a plain key for the api client
        localStorage.setItem(TOKEN_KEY, token);
        set({ token, user, sessionExpired: false });
      },
      clearSession: (opts) => {
        localStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null, sessionExpired: opts?.expired ?? false });
      },
      can: (permission) => hasPermission(get().user?.role, permission),
    }),
    { name: 'palmpay.auth' },
  ),
);
