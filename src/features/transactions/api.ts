import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Paginated, Transaction } from '@/types';

export interface TxFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  settlementStatus?: string[];
  merchantId?: string[];
  terminalId?: string;
  failureReason?: string[];
  method?: string;
  amountMin?: number;
  amountMax?: number;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const txKeys = {
  all: ['transactions'] as const,
  list: (filters: TxFilters) => [...txKeys.all, 'list', filters] as const,
  detail: (id: string) => [...txKeys.all, 'detail', id] as const,
  related: (id: string) => [...txKeys.all, 'related', id] as const,
};

export function useTransactions(filters: TxFilters, opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: txKeys.list(filters),
    queryFn: () => api.get<Paginated<Transaction>>('/transactions', { ...filters }),
    placeholderData: keepPreviousData,
    refetchInterval: opts?.refetchInterval,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: txKeys.detail(id ?? ''),
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
    enabled: Boolean(id),
  });
}

export function useRelatedTransactions(id: string | null) {
  return useQuery({
    queryKey: txKeys.related(id ?? ''),
    queryFn: () => api.get<Transaction[]>(`/transactions/${id}/related`),
    enabled: Boolean(id),
  });
}
