import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, DEFAULT_PAGE_SIZE, type Paginated } from '@/lib/api-client';
import type { AuditAction, AuditEntityType, AuditLogEntry } from '@/types';

export interface AuditLogFilters {
  actorUserId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  /** `changedAt` inclusive, UTC ISO */
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.all, 'list', filters] as const,
};

/** Newest first, one row per changed field. Server-side paging (pageSize max 100). */
export function useAuditLogs(filters: AuditLogFilters, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>('/audit-logs', { pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  });
}
