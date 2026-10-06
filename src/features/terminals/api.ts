import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type { Device, DeviceStatus, Terminal, TerminalDetail, TerminalStatus } from '@/types';
import { merchantKeys } from '@/features/merchants/api';

export interface TerminalFilters {
  search?: string;
  status?: TerminalStatus;
  merchantId?: string;
  page?: number;
  pageSize?: number;
}

export const terminalKeys = {
  all: ['terminals'] as const,
  list: (filters: TerminalFilters) => [...terminalKeys.all, 'list', filters] as const,
  detail: (id: string) => [...terminalKeys.all, 'detail', id] as const,
  availableDevices: () => ['devices', 'InStock'] as const,
};

export function useTerminals(filters: TerminalFilters) {
  return useQuery({
    queryKey: terminalKeys.list(filters),
    queryFn: () => api.get<Paginated<Terminal>>('/terminals', { pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
  });
}

export function useTerminal(id: string) {
  return useQuery({
    queryKey: terminalKeys.detail(id),
    queryFn: () => api.get<TerminalDetail>(`/terminals/${id}`),
  });
}

/** Devices that can be attached to a terminal. */
export function useAvailableDevices(enabled: boolean) {
  return useQuery({
    queryKey: terminalKeys.availableDevices(),
    queryFn: () => api.get<Device[]>('/devices', { status: 'InStock' }),
    enabled,
  });
}

/** Every terminal action can change terminal, merchant and device data. */
const TERMINAL_RELATED = [terminalKeys.all, merchantKeys.all, ['devices']];

export function useAssignDevice(id: string) {
  return useApiMutation({
    mutationFn: (input: { deviceId?: string; palmModuleSerialNumber?: string; reason?: string }) =>
      api.post<Terminal>(`/terminals/${id}/device/assign`, input),
    invalidate: TERMINAL_RELATED,
    success: 'Device assigned',
    error: 'Failed to assign device',
  });
}

export function useUnassignDevice(id: string) {
  return useApiMutation({
    mutationFn: (input: { reason?: string; deviceStatusAfter: DeviceStatus }) =>
      api.delete<Terminal>(`/terminals/${id}/device/unassign`, { ...input, terminalId: id }),
    invalidate: TERMINAL_RELATED,
    success: 'Device unassigned',
    error: 'Failed to unassign device',
  });
}

export function useActivateTerminal(id: string) {
  return useApiMutation({
    mutationFn: () => api.put<Terminal>(`/terminals/${id}/activate`),
    invalidate: TERMINAL_RELATED,
    success: 'Terminal activated',
    error: 'Failed to activate terminal',
  });
}

export function useSuspendTerminal(id: string) {
  return useApiMutation({
    mutationFn: (input: { reason?: string }) =>
      api.put<Terminal>(`/terminals/${id}/suspend`, { ...input, terminalId: id }),
    invalidate: TERMINAL_RELATED,
    success: 'Terminal suspended',
    error: 'Failed to suspend terminal',
  });
}

export function useResumeTerminal(id: string) {
  return useApiMutation({
    mutationFn: () => api.put<Terminal>(`/terminals/${id}/resume`),
    invalidate: TERMINAL_RELATED,
    success: 'Terminal resumed',
    error: 'Failed to resume terminal',
  });
}
