import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  sessionTimeoutMinutes: number;
  setSessionTimeoutMinutes: (m: number) => void;
  notificationPrefs: { email: boolean; criticalAlerts: boolean; weeklyDigest: boolean };
  setNotificationPref: (key: 'email' | 'criticalAlerts' | 'weeklyDigest', value: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      sessionTimeoutMinutes: 15,
      setSessionTimeoutMinutes: (m) => set({ sessionTimeoutMinutes: m }),
      notificationPrefs: { email: true, criticalAlerts: true, weeklyDigest: false },
      setNotificationPref: (key, value) =>
        set((s) => ({ notificationPrefs: { ...s.notificationPrefs, [key]: value } })),
    }),
    { name: 'palmpay.ui' },
  ),
);
