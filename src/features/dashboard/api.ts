import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MerchantStatus } from '@/types';

export interface DashboardSummary {
  activeTerminals: number;
  terminalsDeltaWeek: number;
  todayVolume: number;
  todayVolumeDeltaPct: number;
  successRate24h: number;
  registeredUsers: number;
  registeredUsersToday: number;
  totalTurnover30d: number;
  failedCount30d: number;
  activeMerchants: number;
  avgTransaction30d: number;
  onlineOfflineSplit: { online: number; offline: number; maintenance: number };
}

export interface TopMerchant {
  id: string;
  name: string;
  status: MerchantStatus;
  activeTerminals: number;
  todayTurnover: number;
}

const POLL = 15_000;

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  hourlyVolume: () => [...dashboardKeys.all, 'hourly-volume'] as const,
  statusRatio: () => [...dashboardKeys.all, 'status-ratio'] as const,
  topMerchants: () => [...dashboardKeys.all, 'top-merchants'] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
    refetchInterval: POLL,
  });
}

export function useHourlyVolume() {
  return useQuery({
    queryKey: dashboardKeys.hourlyVolume(),
    queryFn: () => api.get<{ hour: string; volume: number; count: number }[]>('/dashboard/hourly-volume'),
    refetchInterval: POLL,
  });
}

export function useStatusRatio() {
  return useQuery({
    queryKey: dashboardKeys.statusRatio(),
    queryFn: () => api.get<{ status: string; count: number }[]>('/dashboard/status-ratio'),
    refetchInterval: POLL,
  });
}

export function useTopMerchants() {
  return useQuery({
    queryKey: dashboardKeys.topMerchants(),
    queryFn: () => api.get<TopMerchant[]>('/dashboard/top-merchants'),
    refetchInterval: POLL,
  });
}
