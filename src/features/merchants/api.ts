import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Merchant, MerchantDocument, Paginated } from '@/types';

export interface MerchantFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
}

export const merchantKeys = {
  all: ['merchants'] as const,
  list: (filters: MerchantFilters) => [...merchantKeys.all, 'list', filters] as const,
  options: () => [...merchantKeys.all, 'options'] as const,
  detail: (id: string) => [...merchantKeys.all, 'detail', id] as const,
  turnover: (id: string, granularity: string) =>
    [...merchantKeys.all, 'turnover', id, granularity] as const,
};

export function useMerchants(filters: MerchantFilters) {
  return useQuery({
    queryKey: merchantKeys.list(filters),
    queryFn: () => api.get<Paginated<Merchant>>('/merchants', { ...filters }),
    placeholderData: keepPreviousData,
  });
}

/** Lightweight id→name map for filters, joins and selects. */
export function useMerchantOptions() {
  return useQuery({
    queryKey: merchantKeys.options(),
    queryFn: () => api.get<Paginated<Merchant>>('/merchants', { page: 1, pageSize: 100 }),
    select: (res) =>
      res.data.map((m) => ({ id: m.id, name: m.name, status: m.status })),
    staleTime: 60_000,
  });
}

export function useMerchantNameMap() {
  const { data } = useMerchantOptions();
  return new Map((data ?? []).map((m) => [m.id, m.name]));
}

export function useMerchant(id: string) {
  return useQuery({
    queryKey: merchantKeys.detail(id),
    queryFn: () => api.get<Merchant>(`/merchants/${id}`),
  });
}

export function useMerchantTurnover(id: string, granularity: 'daily' | 'weekly' | 'monthly') {
  return useQuery({
    queryKey: merchantKeys.turnover(id, granularity),
    queryFn: () =>
      api.get<{ date: string; volume: number; count: number }[]>(`/merchants/${id}/turnover`, {
        granularity,
      }),
  });
}

export interface MerchantInput {
  name: string;
  legalName: string;
  taxId: string;
  status: Merchant['status'];
  commissionRate: number;
  contact: Merchant['contact'];
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MerchantInput) => api.post<Merchant>('/merchants', input),
    onSuccess: (merchant) => {
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success(`Merchant "${merchant.name}" created`);
    },
    onError: () => toast.error('Failed to create merchant'),
  });
}

export function useUpdateMerchant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<MerchantInput>) => api.patch<Merchant>(`/merchants/${id}`, input),
    onSuccess: (merchant) => {
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success(`Merchant "${merchant.name}" updated`);
    },
    onError: () => toast.error('Failed to update merchant'),
  });
}

export function useUploadDocument(merchantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: string }) =>
      api.post<MerchantDocument>(`/merchants/${merchantId}/documents`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: merchantKeys.detail(merchantId) });
      toast.success('Document uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });
}
