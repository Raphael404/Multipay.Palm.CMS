import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import type { Merchant } from '@/types';
import { useMerchants } from '@/features/merchants/api';
import { MerchantFormSheet } from '@/features/merchants/components/MerchantFormSheet';
import { formatDate, formatGEL } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { Can } from '@/components/shared/Can';
import { ErrorState } from '@/components/shared/ErrorState';

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  status: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/merchants/')({
  validateSearch: searchSchema,
  component: MerchantsPage,
});

function MerchantsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { page = 1, search = '', status } = Route.useSearch();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);

  const query = useMerchants({
    page,
    pageSize: 10,
    search: search || undefined,
    status: status ? [status] : undefined,
    sort: sorting[0]?.id,
    order: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
  });

  const setSearch = (patch: Partial<{ page: number; search: string; status: string | undefined }>) =>
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }), replace: true });

  const columns: ColumnDef<Merchant>[] = [
    {
      accessorKey: 'name',
      header: 'Merchant',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.legalName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    {
      id: 'terminals',
      header: 'Terminals',
      cell: ({ row }) => row.original.terminalIds.length,
    },
    {
      accessorKey: 'turnover.today',
      id: 'turnover.today',
      header: 'Today turnover',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatGEL(row.original.turnover.today, { compact: true })}
        </span>
      ),
    },
    {
      accessorKey: 'commissionRate',
      header: 'Commission',
      cell: ({ row }) => `${row.original.commissionRate.toFixed(1)}%`,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Merchants"
        description="Manage merchant accounts, KYC status and commission rates"
        actions={
          <Can permission="merchants.write">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Add merchant
            </Button>
          </Can>
        }
      />

      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, tax ID, contact..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch({ search: e.target.value })}
            />
          </div>
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setSearch({ status: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(['active', 'suspended', 'pending_kyc', 'closed'] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            data={query.data?.data ?? []}
            loading={query.isPending}
            sorting={{ state: sorting, onChange: setSorting }}
            pagination={{
              page,
              pageSize: query.data?.meta.pageSize ?? 10,
              total: query.data?.meta.total ?? 0,
              onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
            }}
            onRowClick={(m) =>
              void navigate({ to: '/merchants/$merchantId', params: { merchantId: m.id } })
            }
            emptyState={{
              title: 'No merchants found',
              description: 'Adjust filters or add your first merchant.',
            }}
          />
        )}
      </Card>

      <MerchantFormSheet open={formOpen} onOpenChange={setFormOpen} merchant={editing} />
    </>
  );
}
