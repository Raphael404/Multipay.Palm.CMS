import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import { useApiMutation } from '@/lib/query';
import type { AdminUser, InviteUserInput, Role } from '@/types';

export interface UserFilters {
  search?: string;
  role?: Role;
  page?: number;
  pageSize?: number;
}

export const userKeys = {
  all: ['users'] as const,
  list: (filters: UserFilters) => [...userKeys.all, 'list', filters] as const,
};

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => api.get<{ users: Paginated<AdminUser> }>('/users', { pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    select: (res) => res.users,
    placeholderData: keepPreviousData,
  });
}

export function useInviteUser() {
  return useApiMutation({
    mutationFn: (input: InviteUserInput) =>
      api.post<{ userId: string; email: string; role: string }>('/users/invite', input),
    invalidate: [userKeys.all],
    success: (res) => `Invited ${res.email}`,
    error: 'Failed to invite user',
  });
}

export function useChangeUserRole() {
  return useApiMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch(`/users/${id}/role`, { id, role }),
    invalidate: [userKeys.all],
    success: 'Role updated',
    error: 'Failed to change role',
  });
}

export function useToggleUserStatus() {
  return useApiMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/users/${id}/status`, { id, isActive }),
    invalidate: [userKeys.all],
    success: (_, { isActive }) => (isActive ? 'User enabled' : 'User disabled'),
    error: 'Failed to update user',
  });
}
