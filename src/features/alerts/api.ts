import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Paginated, SystemAlert } from '@/types';

export interface AlertFilters {
  page?: number;
  pageSize?: number;
  severity?: string[];
  acknowledged?: boolean;
}

export const alertKeys = {
  all: ['alerts'] as const,
  list: (filters: AlertFilters) => [...alertKeys.all, 'list', filters] as const,
  latest: () => [...alertKeys.all, 'latest'] as const,
  unreadCount: () => [...alertKeys.all, 'unread-count'] as const,
};

export function useAlerts(filters: AlertFilters) {
  return useQuery({
    queryKey: alertKeys.list(filters),
    queryFn: () => api.get<Paginated<SystemAlert>>('/alerts', { ...filters }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useAlertsLatest() {
  return useQuery({
    queryKey: alertKeys.latest(),
    queryFn: () => api.get<SystemAlert[]>('/alerts/latest'),
    refetchInterval: 15_000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, acknowledged }: { id: string; acknowledged: boolean }) =>
      api.patch<SystemAlert>(`/alerts/${id}`, { acknowledged }),
    onSuccess: (alert) => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.all });
      toast.success(alert.acknowledged ? 'Alert acknowledged' : 'Alert reopened');
    },
    onError: () => toast.error('Failed to update alert'),
  });
}

export function useAcknowledgeAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/alerts/acknowledge-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertKeys.all });
      toast.success('All alerts acknowledged');
    },
    onError: () => toast.error('Failed to acknowledge alerts'),
  });
}
