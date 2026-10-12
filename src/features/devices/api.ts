import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type { Device, DeviceDetail, DeviceInput, DeviceStatus, DeviceType } from '@/types';
import { merchantKeys } from '@/features/merchants/api';

export interface DeviceFilters {
  status?: DeviceStatus;
  type?: DeviceType;
}

export const deviceKeys = {
  all: ['devices'] as const,
  list: (filters: DeviceFilters) => [...deviceKeys.all, 'list', filters] as const,
  detail: (id: string) => [...deviceKeys.all, 'detail', id] as const,
};

/** The endpoint returns a plain array, not a page. */
export function useDevices(filters: DeviceFilters, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: deviceKeys.list(filters),
    queryFn: () => api.get<Device[]>('/devices', { ...filters }),
    enabled: opts.enabled,
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => api.get<DeviceDetail>(`/devices/${id}`),
  });
}

/**
 * Device changes also show up on terminal and merchant pages. `['terminals']`
 * is `terminalKeys.all`, spelled out because terminals/api imports this file.
 */
const DEVICE_RELATED = [deviceKeys.all, ['terminals'], merchantKeys.all];

export function useRegisterDevice() {
  return useApiMutation({
    mutationFn: (input: DeviceInput) => api.post<Device>('/devices', input),
    invalidate: DEVICE_RELATED,
    success: 'Device registered',
    error: 'Failed to register device',
  });
}

export function useUpdateDevice(id: string) {
  return useApiMutation({
    mutationFn: (input: DeviceInput) => api.put<Device>(`/devices/${id}`, { ...input, deviceId: id }),
    invalidate: DEVICE_RELATED,
    success: 'Device updated',
    error: 'Failed to update device',
  });
}

export function useChangeDeviceStatus(id: string) {
  return useApiMutation({
    mutationFn: (input: { status: DeviceStatus; reason?: string }) =>
      api.put<Device>(`/devices/${id}/status`, { ...input, deviceId: id }),
    invalidate: DEVICE_RELATED,
    success: 'Device status changed',
    error: 'Failed to change device status',
  });
}
