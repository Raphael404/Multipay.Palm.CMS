import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import type {
  FailedByReasonItem,
  FailedMetrics,
  FailedTimelineItem,
  FailedTransactionItem,
} from '@/types';

export const failedKeys = {
  all: ['failed-monitoring'] as const,
  metrics: (days: number) => [...failedKeys.all, 'metrics', days] as const,
  byReason: (days: number) => [...failedKeys.all, 'by-reason', days] as const,
  timeline: (days: number) => [...failedKeys.all, 'timeline', days] as const,
  list: (days: number, page: number, pageSize: number) =>
    [...failedKeys.all, 'list', days, page, pageSize] as const,
};

export function useFailedMetrics(days: number) {
  return useQuery({
    queryKey: failedKeys.metrics(days),
    queryFn: () => api.get<FailedMetrics>('/failed-monitoring/metrics', { days }),
  });
}

export function useFailedByReason(days: number) {
  return useQuery({
    queryKey: failedKeys.byReason(days),
    queryFn: () =>
      api.get<{ items: FailedByReasonItem[] }>('/failed-monitoring/by-reason', { days }),
    select: (res) => res.items,
  });
}

export function useFailedTimeline(days: number) {
  return useQuery({
    queryKey: failedKeys.timeline(days),
    queryFn: () =>
      api.get<{ items: FailedTimelineItem[] }>('/failed-monitoring/timeline', { days }),
    select: (res) => res.items,
  });
}

export function useFailedTransactions(days: number, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: failedKeys.list(days, page, pageSize),
    queryFn: () =>
      api.get<Paginated<FailedTransactionItem>>('/failed-monitoring', { days, page, pageSize }),
    placeholderData: keepPreviousData,
  });
}
