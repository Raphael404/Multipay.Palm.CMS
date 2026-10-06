import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { TERMINAL_STATUSES, type Terminal } from '@/types';
import { useTerminals } from '@/features/terminals/api';
import { useMerchantOptions } from '@/features/merchants/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { listSearchParams, optionalParam } from '@/lib/search-params';
import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { SearchInput } from '@/components/shared/SearchInput';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { col } from '@/components/shared/columns';

const searchSchema = z.object({
  ...listSearchParams,
  status: optionalParam(z.enum(TERMINAL_STATUSES)),
  merchantId: optionalParam(z.string()),
});

export const Route = createFileRoute('/_app/terminals/')({
  validateSearch: searchSchema,
  component: TerminalsPage,
});

const STATUS_OPTIONS = enumOptions(TERMINAL_STATUSES);

const columns: ColumnDef<Terminal>[] = [
  col.text('referenceId', 'Terminal', { strong: true }),
  {
    accessorKey: 'merchantName',
    header: 'Merchant',
    cell: ({ row }) =>
      row.original.merchantName ?? <span className="text-muted-foreground">Unassigned</span>,
  },
  col.label('terminalType', 'Type'),
  col.status('status'),
  {
    id: 'device',
    header: 'Palm module',
    cell: ({ row }) =>
      row.original.currentDevice?.palmModuleSerialNumber ?? (
        <span className="text-muted-foreground">No device</span>
      ),
  },
  col.date('registeredAt', 'Registered', { time: false }),
];

function TerminalsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', status, merchantId } = Route.useSearch();
  const merchants = useMerchantOptions();

  const query = useTerminals({ page, search: search || undefined, status, merchantId });

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  return (
    <>
      <PageHeader title="Palm Terminals" description="Terminal fleet, status and attached devices" />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search reference, serial..."
            value={search}
            onChange={(v) => setSearch({ search: v || undefined })}
          />
          <OptionSelect
            value={status}
            onChange={(v) => setSearch({ status: v })}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <OptionSelect
            value={merchantId}
            onChange={(v) => setSearch({ merchantId: v })}
            options={(merchants.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
            allLabel="All merchants"
            className="w-56"
          />
        </div>

        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          pagination={{
            page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: query.data?.totalCount ?? 0,
            onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
          }}
          onRowClick={(t) =>
            void navigate({ to: '/terminals/$terminalId', params: { terminalId: t.id } })
          }
          emptyState={{ title: 'No terminals found', description: 'Adjust the search or filters.' }}
        />
      </SectionCard>
    </>
  );
}
