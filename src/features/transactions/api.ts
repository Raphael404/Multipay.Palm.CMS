import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type { PaymentStatus, TransactionDetail, TransactionListItem } from '@/types';

export interface TxFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: PaymentStatus;
  merchantId?: string;
  terminalId?: string;
  page?: number;
  pageSize?: number;
}

export type ExportTransactionsInput = Omit<TxFilters, 'page' | 'pageSize'>;

export const txKeys = {
  all: ['transactions'] as const,
  list: (filters: TxFilters) => [...txKeys.all, 'list', filters] as const,
  detail: (id: string) => [...txKeys.all, 'detail', id] as const,
};

export function useTransactions(filters: TxFilters) {
  return useQuery({
    queryKey: txKeys.list(filters),
    queryFn: () =>
      api.get<{ transactions: Paginated<TransactionListItem> }>('/transactions', { pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    select: (res) => res.transactions,
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: txKeys.detail(id ?? ''),
    queryFn: () => api.get<TransactionDetail>(`/transactions/${id}`),
    enabled: Boolean(id),
  });
}

/** POST /transactions/export — same filters as the list, no pagination; downloads a file. */
export function useExportTransactions() {
  return useApiMutation({
    mutationFn: (filters: ExportTransactionsInput) =>
      api.download('POST', '/transactions/export', {
        body: filters,
        fallbackName: `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      }),
    success: 'Export downloaded',
    error: 'Export failed',
  });
}
