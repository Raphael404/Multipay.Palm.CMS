import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type {
  MerchantDetail,
  MerchantListItem,
  MerchantStatus,
  MerchantTerminalItem,
  MerchantTransactionItem,
  MerchantTurnover,
  UpdateMerchantInput,
} from '@/types';

export interface MerchantFilters {
  search?: string;
  status?: MerchantStatus;
  page?: number;
  pageSize?: number;
}

export const merchantKeys = {
  all: ['merchants'] as const,
  list: (filters: MerchantFilters) => [...merchantKeys.all, 'list', filters] as const,
  options: () => [...merchantKeys.all, 'options'] as const,
  detail: (id: string) => [...merchantKeys.all, 'detail', id] as const,
  terminals: (id: string) => [...merchantKeys.all, 'terminals', id] as const,
  turnover: (id: string, days: number) => [...merchantKeys.all, 'turnover', id, days] as const,
  transactions: (id: string, page: number, pageSize: number) =>
    [...merchantKeys.all, 'transactions', id, page, pageSize] as const,
};

export function useMerchants(filters: MerchantFilters) {
  return useQuery({
    queryKey: merchantKeys.list(filters),
    queryFn: () =>
      api.get<{ merchants: Paginated<MerchantListItem> }>('/merchants', { pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    select: (res) => res.merchants,
    placeholderData: keepPreviousData,
  });
}

/** Lightweight id→name list for filter selects. */
export function useMerchantOptions() {
  return useQuery({
    queryKey: merchantKeys.options(),
    queryFn: () =>
      api.get<{ merchants: Paginated<MerchantListItem> }>('/merchants', {
        page: 1,
        pageSize: 200,
      }),
    select: (res) =>
      res.merchants.items.map((m) => ({
        id: m.id,
        name: m.merchantName ?? m.brandName ?? m.id,
      })),
    staleTime: 5 * 60_000,
  });
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: merchantKeys.detail(id),
    queryFn: () => api.get<MerchantDetail>(`/merchants/${id}`),
  });
}

export function useMerchantTerminals(id: string) {
  return useQuery({
    queryKey: merchantKeys.terminals(id),
    queryFn: () =>
      api.get<{ terminals: MerchantTerminalItem[] }>(`/merchants/${id}/terminals`),
    select: (res) => res.terminals,
  });
}

export function useMerchantTurnover(id: string, days: number) {
  return useQuery({
    queryKey: merchantKeys.turnover(id, days),
    queryFn: () => api.get<MerchantTurnover>(`/merchants/${id}/turnover`, { days }),
  });
}

export function useMerchantTransactions(id: string, page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return useQuery({
    queryKey: merchantKeys.transactions(id, page, pageSize),
    queryFn: () =>
      api.get<{ transactions: Paginated<MerchantTransactionItem> }>(
        `/merchants/${id}/transactions`,
        { page, pageSize },
      ),
    select: (res) => res.transactions,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateMerchant(id: string) {
  return useApiMutation({
    mutationFn: (input: UpdateMerchantInput) =>
      api.put<{ id: string; updatedAt: string }>(`/merchants/${id}`, { ...input, id }),
    invalidate: [merchantKeys.all],
    success: 'Merchant updated',
    error: 'Failed to update merchant',
  });
}
