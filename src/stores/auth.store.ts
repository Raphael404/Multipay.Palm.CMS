import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/types';
import { hasPermission, type Permission } from '@/lib/permissions';

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  sessionExpired: boolean;
  setSession: (token: string, user: AdminUser) => void;
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
        // mirrored to plain keys for the api client / mock audit trail
        localStorage.setItem('palmpay.token', token);
        localStorage.setItem('palmpay.user', JSON.stringify({ id: user.id, name: user.name }));
        set({ token, user, sessionExpired: false });
      },
      clearSession: (opts) => {
        localStorage.removeItem('palmpay.token');
        localStorage.removeItem('palmpay.user');
        set({ token: null, user: null, sessionExpired: opts?.expired ?? false });
      },
      can: (permission) => hasPermission(get().user?.role, permission),
    }),
    { name: 'palmpay.auth' },
  ),
);
