import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { MERCHANT_STATUSES, type MerchantListItem } from '@/types';
import { useMerchants } from '@/features/merchants/api';
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
  status: optionalParam(z.enum(MERCHANT_STATUSES)),
});

export const Route = createFileRoute('/_app/merchants/')({
  validateSearch: searchSchema,
  component: MerchantsPage,
});

const STATUS_OPTIONS = enumOptions(MERCHANT_STATUSES);

const columns: ColumnDef<MerchantListItem>[] = [
  {
    accessorKey: 'merchantName',
    header: 'Merchant',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.merchantName ?? '—'}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.brandName ?? row.original.customerName ?? ''}
        </p>
      </div>
    ),
  },
  col.text('taxCode', 'Tax code'),
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {[row.original.region, row.original.district].filter(Boolean).join(', ') || '—'}
      </span>
    ),
  },
  col.status('status'),
  { accessorKey: 'terminalsCount', header: 'Terminals' },
  col.date('registrationDate', 'Registered', { time: false }),
];

function MerchantsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', status } = Route.useSearch();

  const query = useMerchants({ page, search: search || undefined, status });

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  return (
    <>
      <PageHeader title="Merchants" description="Merchant accounts and their terminals" />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search name, tax code..."
            value={search}
            onChange={(v) => setSearch({ search: v || undefined })}
          />
          <OptionSelect
            value={status}
            onChange={(v) => setSearch({ status: v })}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
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
          onRowClick={(m) =>
            void navigate({ to: '/merchants/$merchantId', params: { merchantId: m.id } })
          }
          emptyState={{ title: 'No merchants found', description: 'Adjust the search or filters.' }}
        />
      </SectionCard>
    </>
  );
}
