import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { HourlyDataPoint, Kpis, RecentTransaction, SuccessRatio, TopMerchant } from '@/types';

const POLL = 30_000;

export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: () => [...dashboardKeys.all, 'kpis'] as const,
  hourlyVolume: () => [...dashboardKeys.all, 'hourly-volume'] as const,
  successRatio: () => [...dashboardKeys.all, 'success-ratio'] as const,
  topMerchants: (limit: number) => [...dashboardKeys.all, 'top-merchants', limit] as const,
  recentTransactions: (limit: number) =>
    [...dashboardKeys.all, 'recent-transactions', limit] as const,
};

export function useKpis() {
  return useQuery({
    queryKey: dashboardKeys.kpis(),
    queryFn: () => api.get<Kpis>('/dashboard/kpis'),
    refetchInterval: POLL,
  });
}

export function useHourlyVolume() {
  return useQuery({
    queryKey: dashboardKeys.hourlyVolume(),
    queryFn: () => api.get<{ items: HourlyDataPoint[] }>('/dashboard/hourly-volume'),
    select: (res) => res.items,
    refetchInterval: POLL,
  });
}

export function useSuccessRatio() {
  return useQuery({
    queryKey: dashboardKeys.successRatio(),
    queryFn: () => api.get<SuccessRatio>('/dashboard/success-ratio'),
    refetchInterval: POLL,
  });
}

export function useTopMerchants(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.topMerchants(limit),
    queryFn: () => api.get<{ merchants: TopMerchant[] }>('/dashboard/top-merchants', { limit }),
    select: (res) => res.merchants,
    refetchInterval: POLL,
  });
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.recentTransactions(limit),
    queryFn: () =>
      api.get<{ transactions: RecentTransaction[] }>('/dashboard/recent-transactions', { limit }),
    select: (res) => res.transactions,
    refetchInterval: POLL,
  });
}
