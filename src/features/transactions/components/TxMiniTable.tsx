import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Transaction } from '@/types';
import { useTransactions, type TxFilters } from '@/features/transactions/api';
import { useMerchantNameMap } from '@/features/merchants/api';
import { formatDateTime, formatGEL } from '@/lib/format';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText } from '@/components/shared/StatusText';

/** Compact reusable transactions table for detail pages. */
export function TxMiniTable({
  filters,
  pageSize = 8,
  onRowClick,
}: {
  filters: Omit<TxFilters, 'page' | 'pageSize'>;
  pageSize?: number;
  onRowClick?: (tx: Transaction) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useTransactions({ ...filters, page, pageSize });
  const merchantNames = useMerchantNameMap();

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'occurredAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDateTime(row.original.occurredAt)}</span>
      ),
    },
    {
      accessorKey: 'merchantId',
      header: 'Merchant',
      cell: ({ row }) => merchantNames.get(row.original.merchantId) ?? row.original.merchantId,
    },
    { accessorKey: 'terminalId', header: 'Terminal' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{formatGEL(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      loading={query.isPending}
      onRowClick={onRowClick}
      pagination={{
        page,
        pageSize,
        total: query.data?.meta.total ?? 0,
        onPageChange: setPage,
      }}
      emptyState={{ title: 'No transactions', description: 'Nothing recorded for this scope yet.' }}
    />
  );
}
