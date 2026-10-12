import { useEffect, useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { X } from 'lucide-react';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/types';
import { useAuditLogs } from '@/features/audit-logs/api';
import { auditColumns, correlationBands } from '@/features/audit-logs/components/audit-columns';
import { useUserOptions } from '@/features/users/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { guidParam, isoDateParam, optionalParam } from '@/lib/search-params';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { cn } from '@/lib/utils';

const searchSchema = z.object({
  page: optionalParam(z.number().int().min(1)),
  actorUserId: guidParam,
  action: optionalParam(z.enum(AUDIT_ACTIONS)),
  entityType: optionalParam(z.enum(AUDIT_ENTITY_TYPES)),
  entityId: guidParam,
  dateFrom: isoDateParam,
  dateTo: isoDateParam,
});

const isGuid = (v: string) => z.guid().safeParse(v).success;
/** The filter value an Entity ID input text stands for. */
const applied = (text: string) => (isGuid(text.trim()) ? text.trim() : undefined);

type AuditSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute('/_app/audit-logs')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    if (!useAuthStore.getState().can('audit.read')) {
      throw redirect({ to: '/' });
    }
  },
  component: AuditLogsPage,
});

const ACTION_OPTIONS = enumOptions(AUDIT_ACTIONS);
const ENTITY_OPTIONS = enumOptions(AUDIT_ENTITY_TYPES);

function AuditLogsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, ...filters } = Route.useSearch();
  const users = useUserOptions();

  const query = useAuditLogs({ ...filters, page });
  const rows = query.data?.items ?? [];

  const patchSearch = (patch: Partial<AuditSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Audit Log" description="Who changed what, field by field" />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter
            from={filters.dateFrom}
            to={filters.dateTo}
            onChange={(dateFrom, dateTo) => patchSearch({ dateFrom, dateTo })}
          />
          <SearchableSelect
            value={filters.actorUserId}
            onChange={(actorUserId) => patchSearch({ actorUserId })}
            options={users.data ?? []}
            allLabel="All users"
            loading={users.isPending}
            searchPlaceholder="Search name or email..."
            className="w-56"
          />
          <OptionSelect
            value={filters.action}
            onChange={(action) => patchSearch({ action })}
            options={ACTION_OPTIONS}
            allLabel="All actions"
            className="w-40"
          />
          <OptionSelect
            value={filters.entityType}
            onChange={(entityType) => patchSearch({ entityType })}
            options={ENTITY_OPTIONS}
            allLabel="All entities"
          />
          <EntityIdInput
            value={filters.entityId}
            onChange={(entityId) => patchSearch({ entityId })}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ search: { page: 1 }, replace: true })}
            >
              <X className="size-4" /> Clear filters
            </Button>
          )}
        </div>

        <DataTable
          columns={auditColumns}
          data={rows}
          loading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          rowClassName={correlationBands(rows)}
          pagination={{
            page,
            pageSize: query.data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total: query.data?.totalCount ?? 0,
            onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
          }}
          emptyState={{ title: 'No audit entries', description: 'Adjust the filters.' }}
        />
      </SectionCard>
    </>
  );
}

/** Entity GUID filter; applied only while the input holds a complete, valid GUID. */
function EntityIdInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(value ?? '');
  // Follow outside changes (e.g. "Clear filters") without clobbering what is being typed.
  useEffect(() => {
    setDraft((d) => (applied(d) === value ? d : (value ?? '')));
  }, [value]);

  const trimmed = draft.trim();
  const invalid = trimmed !== '' && !isGuid(trimmed);

  return (
    <Input
      value={draft}
      placeholder="Entity ID (GUID)"
      aria-invalid={invalid}
      className={cn('w-80 font-mono text-xs', invalid && 'border-destructive')}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (applied(next) !== value) onChange(applied(next));
      }}
    />
  );
}
