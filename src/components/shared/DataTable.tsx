import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  /** Server-style pagination meta; omit to hide the pager. */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    state: SortingState;
    onChange: (state: SortingState) => void;
  };
  onRowClick?: (row: TData) => void;
  emptyState?: { title: string; description?: string; action?: ReactNode };
  rowClassName?: (row: TData) => string | undefined;
}

export function DataTable<TData>({
  columns,
  data,
  loading,
  pagination,
  sorting,
  onRowClick,
  emptyState,
  rowClassName,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting: sorting?.state ?? [] },
    onSortingChange: (updater) => {
      if (!sorting) return;
      const next = typeof updater === 'function' ? updater(sorting.state) : updater;
      sorting.onChange(next);
    },
    enableSorting: Boolean(sorting),
  });

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        title={emptyState?.title ?? 'No results'}
        description={emptyState?.description ?? 'Try adjusting your filters or search query.'}
        action={emptyState?.action}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border bg-card-elevated/50 hover:bg-card-elevated/50">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                        canSort && 'cursor-pointer select-none',
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (dir === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          ))}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: pagination?.pageSize ?? 8 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {columns.map((_, j) => (
                      <TableCell key={j} className="py-3.5">
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-border',
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row.original),
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              {pagination.page} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pageCount || loading}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
