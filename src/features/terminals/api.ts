import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Paginated, Terminal, TerminalStatus } from '@/types';
import { merchantKeys } from '@/features/merchants/api';

export interface TerminalFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  merchantId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const terminalKeys = {
  all: ['terminals'] as const,
  list: (filters: TerminalFilters) => [...terminalKeys.all, 'list', filters] as const,
  detail: (id: string) => [...terminalKeys.all, 'detail', id] as const,
};

export function useTerminals(filters: TerminalFilters) {
  return useQuery({
    queryKey: terminalKeys.list(filters),
    queryFn: () => api.get<Paginated<Terminal>>('/terminals', { ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useTerminal(id: string) {
  return useQuery({
    queryKey: terminalKeys.detail(id),
    queryFn: () => api.get<Terminal>(`/terminals/${id}`),
  });
}

export interface TerminalInput {
  serialNumber?: string;
  merchantId?: string | null;
  locationAddress?: string;
  firmwareVersion?: string;
  status?: TerminalStatus;
}

export function useCreateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TerminalInput) => api.post<Terminal>('/terminals', input),
    onSuccess: (terminal) => {
      void queryClient.invalidateQueries({ queryKey: terminalKeys.all });
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success(`Terminal ${terminal.id} registered`);
    },
    onError: () => toast.error('Failed to register terminal'),
  });
}

export function useUpdateTerminal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TerminalInput) => api.patch<Terminal>(`/terminals/${id}`, input),
    onSuccess: (terminal) => {
      void queryClient.invalidateQueries({ queryKey: terminalKeys.all });
      void queryClient.invalidateQueries({ queryKey: merchantKeys.all });
      toast.success(`Terminal ${terminal.id} updated`);
    },
    onError: () => toast.error('Failed to update terminal'),
  });
}
