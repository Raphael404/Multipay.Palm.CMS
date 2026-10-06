import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import type { PeriodValue } from '@/components/shared/PeriodPicker';
import type {
  AnalyticsOverview,
  MerchantAnalyticsItem,
  TerminalAnalyticsItem,
  TimeSeriesDataPoint,
} from '@/types';

/** `period` query params; `dateFrom`/`dateTo` only for `custom`. */
function periodParams(p: PeriodValue) {
  return p.period === 'custom'
    ? { period: p.period, dateFrom: p.from, dateTo: p.to }
    : { period: p.period };
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (p: PeriodValue) => [...analyticsKeys.all, 'overview', p] as const,
  byMerchant: (p: PeriodValue, page: number) =>
    [...analyticsKeys.all, 'by-merchant', p, page] as const,
  byTerminal: (p: PeriodValue, page: number) =>
    [...analyticsKeys.all, 'by-terminal', p, page] as const,
  timeSeries: (p: PeriodValue, granularity: Granularity) =>
    [...analyticsKeys.all, 'time-series', p, granularity] as const,
};

export type Granularity = 'hourly' | 'daily';

export function useAnalyticsOverview(p: PeriodValue) {
  return useQuery({
    queryKey: analyticsKeys.overview(p),
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview', periodParams(p)),
  });
}

export function useAnalyticsByMerchant(p: PeriodValue, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: analyticsKeys.byMerchant(p, page),
    queryFn: () =>
      api.get<{ merchants: Paginated<MerchantAnalyticsItem> }>('/analytics/by-merchant', {
        ...periodParams(p),
        page,
        pageSize,
      }),
    select: (res) => res.merchants,
    placeholderData: keepPreviousData,
  });
}

export function useAnalyticsByTerminal(p: PeriodValue, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: analyticsKeys.byTerminal(p, page),
    queryFn: () =>
      api.get<{ terminals: Paginated<TerminalAnalyticsItem> }>('/analytics/by-terminal', {
        ...periodParams(p),
        page,
        pageSize,
      }),
    select: (res) => res.terminals,
    placeholderData: keepPreviousData,
  });
}

export function useAnalyticsTimeSeries(p: PeriodValue, granularity: Granularity) {
  return useQuery({
    queryKey: analyticsKeys.timeSeries(p, granularity),
    queryFn: () =>
      api.get<{ dataPoints: TimeSeriesDataPoint[] }>('/analytics/time-series', {
        ...periodParams(p),
        granularity,
      }),
    select: (res) => res.dataPoints,
  });
}
