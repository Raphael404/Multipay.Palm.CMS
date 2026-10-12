import { useState } from 'react';
import type { AuditEntityType } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { useAuditLogs } from '@/features/audit-logs/api';
import { useAuthStore } from '@/stores/auth.store';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { correlationBands, entityHistoryColumns } from './audit-columns';

interface EntityHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  title?: string;
}

/** Audit trail of one entity (`entityType` + `entityId`). Hidden without `audit.read`. */
export function EntityHistory(props: EntityHistoryProps) {
  // Keyed so paging starts over when navigating to another entity.
  return <EntityHistoryTable key={`${props.entityType}:${props.entityId}`} {...props} />;
}

function EntityHistoryTable({ entityType, entityId, title = 'Change history' }: EntityHistoryProps) {
  const allowed = useAuthStore((s) => s.can('audit.read'));
  const [page, setPage] = useState(1);
  const query = useAuditLogs({ entityType, entityId, page }, { enabled: allowed });

  if (!allowed) return null;
  const rows = query.data?.items ?? [];

  return (
    <SectionCard title={title}>
      <DataTable
        columns={entityHistoryColumns}
        data={rows}
        loading={query.isPending}
        error={query.isError}
        onRetry={() => void query.refetch()}
        rowClassName={correlationBands(rows)}
        pagination={{
          page,
          pageSize: query.data?.pageSize ?? DEFAULT_PAGE_SIZE,
          total: query.data?.totalCount ?? 0,
          onPageChange: setPage,
        }}
        emptyState={{ title: 'No changes recorded', description: 'Edits will appear here.' }}
      />
    </SectionCard>
  );
}
