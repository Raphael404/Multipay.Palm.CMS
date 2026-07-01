import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { z } from 'zod';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  CalendarRange,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { Transaction } from '@/types';
import { useRelatedTransactions, useTransaction, useTransactions } from '@/features/transactions/api';
import { useMerchantNameMap, useMerchantOptions } from '@/features/merchants/api';
import { formatDateTime, formatGEL } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { ErrorState } from '@/components/shared/ErrorState';

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  status: z.array(z.string()).optional().catch(undefined),
  settlementStatus: z.array(z.string()).optional().catch(undefined),
  merchantId: z.array(z.string()).optional().catch(undefined),
  terminalId: z.string().optional().catch(undefined),
  failureReason: z.array(z.string()).optional().catch(undefined),
  amountMin: z.number().optional().catch(undefined),
  amountMax: z.number().optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/transactions')({
  validateSearch: searchSchema,
  component: TransactionsPage,
});

const TX_STATUSES = ['success', 'failed', 'pending', 'refunded'];
const SETTLEMENT_STATUSES = ['pending', 'settled', 'delayed', 'on_hold'];
const FAILURE_REASONS = ['network_error', 'timeout', 'bank_decline', 'terminal_offline', 'auth_failed'];

function TransactionsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const filters = Route.useSearch();
  const { page = 1 } = filters;
  const [sorting, setSorting] = useState<SortingState>([{ id: 'occurredAt', desc: true }]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);

  const merchantNames = useMerchantNameMap();
  const query = useTransactions({
    ...filters,
    page,
    pageSize: 12,
    sort: sorting[0]?.id,
    order: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
  });

  const patchSearch = (patch: Record<string, unknown>) =>
    void navigate({
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace: true,
    });

  const serverExport = useMutation({
    mutationFn: (exportFormat: 'pdf' | 'xlsx') =>
      api.post('/reports/export', {
        report: 'Transactions export',
        format: exportFormat,
        scope: 'Current filtered view',
      }),
    onSuccess: (_, exportFormat) =>
      toast.success(`${exportFormat.toUpperCase()} export queued`, {
        description: 'You will find it under Reports → Recent exports.',
      }),
    onError: () => toast.error('Export failed'),
  });

  const activeFilterCount = [
    filters.status?.length,
    filters.settlementStatus?.length,
    filters.merchantId?.length,
    filters.terminalId,
    filters.failureReason?.length,
    filters.amountMin,
    filters.amountMax,
    filters.from,
  ].filter(Boolean).length;

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'Transaction ID',
      enableSorting: false,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'occurredAt',
      header: 'Date / time',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDateTime(row.original.occurredAt)}</span>
      ),
    },
    {
      accessorKey: 'merchantId',
      header: 'Merchant',
      enableSorting: false,
      cell: ({ row }) => merchantNames.get(row.original.merchantId) ?? row.original.merchantId,
    },
    { accessorKey: 'terminalId', header: 'Terminal', enableSorting: false },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{formatGEL(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: 'method',
      header: 'Method',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.method === 'palm_authentication' ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Fingerprint className="size-4 text-info" /> Palm
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <CreditCard className="size-4" /> Card
          </span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    {
      accessorKey: 'errorCode',
      header: 'Error',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.errorCode ? (
          <span className="font-mono text-xs text-destructive">{row.original.errorCode}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'settlementStatus',
      header: 'Settlement',
      enableSorting: false,
      cell: ({ row }) => <StatusText status={row.original.settlementStatus} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description="All palm and card-fallback payment operations"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `transactions-${format(new Date(), 'yyyyMMdd-HHmm')}`,
                  (query.data?.data ?? []).map((t) => ({
                    id: t.id,
                    occurredAt: t.occurredAt,
                    merchant: merchantNames.get(t.merchantId) ?? t.merchantId,
                    terminal: t.terminalId,
                    amount: t.amount,
                    currency: t.currency,
                    method: t.method,
                    status: t.status,
                    errorCode: t.errorCode ?? '',
                    failureReason: t.failureReason ?? '',
                    settlementStatus: t.settlementStatus,
                    commission: t.commissionAmount,
                  })),
                )
              }
            >
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => serverExport.mutate('xlsx')}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => serverExport.mutate('pdf')}>
              <FileText className="size-4" /> PDF
            </Button>
          </>
        }
      />

      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search TX ID, terminal, merchant..."
              className="pl-9"
              value={filters.search ?? ''}
              onChange={(e) => patchSearch({ search: e.target.value || undefined })}
            />
          </div>
          <DateRangeFilter
            from={filters.from}
            to={filters.to}
            onChange={(from, to) => patchSearch({ from, to })}
          />
          <Button
            variant={filtersOpen || activeFilterCount > 0 ? 'secondary' : 'outline'}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="size-4" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-info text-[11px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void navigate({ search: { page: 1, search: filters.search }, replace: true })
              }
            >
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>

        <Collapsible open={filtersOpen}>
          <CollapsibleContent>
            <AdvancedFilters filters={filters} onPatch={patchSearch} />
          </CollapsibleContent>
        </Collapsible>

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
              pageSize: query.data?.meta.pageSize ?? 12,
              total: query.data?.meta.total ?? 0,
              onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
            }}
            onRowClick={(t) => setSelectedTx(t.id)}
            emptyState={{ title: 'No transactions match these filters' }}
          />
        )}
      </Card>

      <TxDetailSheet txId={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
}

function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}) {
  const [draft, setDraft] = useState<DateRange | undefined>();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarRange className="size-4" />
          {from && to
            ? `${format(new Date(from), 'dd MMM')} – ${format(new Date(to), 'dd MMM')}`
            : 'Date range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={draft}
          onSelect={(range) => {
            setDraft(range);
            if (range?.from && range?.to) {
              onChange(
                range.from.toISOString(),
                new Date(range.to.setHours(23, 59, 59, 999)).toISOString(),
              );
            }
          }}
        />
        {(from || draft) && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setDraft(undefined);
                onChange(undefined, undefined);
              }}
            >
              Clear range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AdvancedFilters({
  filters,
  onPatch,
}: {
  filters: Record<string, unknown> & {
    status?: string[];
    settlementStatus?: string[];
    merchantId?: string[];
    terminalId?: string;
    failureReason?: string[];
    amountMin?: number;
    amountMax?: number;
  };
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const merchants = useMerchantOptions();

  const toggleArray = (key: string, value: string, current?: string[]) => {
    const set = new Set(current ?? []);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    onPatch({ [key]: set.size ? [...set] : undefined });
  };

  return (
    <div className="mb-4 grid gap-5 rounded-xl border border-border bg-card-elevated/40 p-4 md:grid-cols-2 xl:grid-cols-4">
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          Status
        </Label>
        <div className="space-y-1.5">
          {TX_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.status?.includes(s) ?? false}
                onCheckedChange={() => toggleArray('status', s, filters.status)}
              />
              <StatusText status={s} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          Settlement
        </Label>
        <div className="space-y-1.5">
          {SETTLEMENT_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.settlementStatus?.includes(s) ?? false}
                onCheckedChange={() => toggleArray('settlementStatus', s, filters.settlementStatus)}
              />
              <StatusText status={s} />
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          Failure reason
        </Label>
        <div className="space-y-1.5">
          {FAILURE_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={filters.failureReason?.includes(r) ?? false}
                onCheckedChange={() => toggleArray('failureReason', r, filters.failureReason)}
              />
              {statusLabel(r)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            Merchants
          </Label>
          <Select
            value="_"
            onValueChange={(v) => toggleArray('merchantId', v, filters.merchantId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Toggle merchant..." />
            </SelectTrigger>
            <SelectContent>
              {(merchants.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {filters.merchantId?.includes(m.id) ? '✓ ' : ''}
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filters.merchantId?.length ?? 0) > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {filters.merchantId?.length} selected
            </p>
          )}
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            Terminal ID
          </Label>
          <Input
            placeholder="MP-228"
            value={filters.terminalId ?? ''}
            onChange={(e) => onPatch({ terminalId: e.target.value || undefined })}
          />
        </div>
        <div>
          <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            Amount (₾)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.amountMin ?? ''}
              onChange={(e) =>
                onPatch({ amountMin: e.target.value ? Number(e.target.value) : undefined })
              }
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.amountMax ?? ''}
              onChange={(e) =>
                onPatch({ amountMax: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TxDetailSheet({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const tx = useTransaction(txId);
  const related = useRelatedTransactions(txId);
  const merchantNames = useMerchantNameMap();
  const t = tx.data;

  return (
    <Sheet open={Boolean(txId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{txId}</SheetTitle>
          <SheetDescription>
            {t ? formatDateTime(t.occurredAt) : 'Loading transaction…'}
          </SheetDescription>
        </SheetHeader>

        {t && (
          <div className="space-y-6 px-4 pb-6">
            <div className="rounded-xl bg-card-elevated p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{formatGEL(t.amount)}</p>
              <div className="mt-1 flex items-center justify-center gap-3">
                <StatusText status={t.status} withDot />
                <span className="text-sm text-muted-foreground">
                  {t.method === 'palm_authentication' ? 'Palm authentication' : 'Card fallback'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Details</h4>
              <dl className="space-y-2 text-sm">
                <Row label="Merchant" value={merchantNames.get(t.merchantId) ?? t.merchantId} />
                <Row label="Terminal" value={t.terminalId} />
                <Row label="Currency" value={t.currency} />
                {t.errorCode && (
                  <Row
                    label="Error code"
                    value={<span className="font-mono text-destructive">{t.errorCode}</span>}
                  />
                )}
                {t.failureReason && (
                  <Row label="Failure reason" value={statusLabel(t.failureReason)} />
                )}
              </dl>
            </div>

            <Separator />

            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Timeline</h4>
              <ol className="space-y-0">
                <TimelineItem
                  label="Authorized"
                  at={formatDateTime(t.occurredAt)}
                  done
                  last={false}
                />
                <TimelineItem
                  label={
                    t.settlementStatus === 'settled'
                      ? 'Settled'
                      : `Settlement ${statusLabel(t.settlementStatus).toLowerCase()}`
                  }
                  at={t.settledAt ? formatDateTime(t.settledAt) : 'Pending bank batch'}
                  done={t.settlementStatus === 'settled'}
                  last
                />
              </ol>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Commission breakdown</h4>
              <dl className="space-y-2 text-sm">
                <Row label="Gross amount" value={formatGEL(t.amount)} />
                <Row label="Commission" value={`− ${formatGEL(t.commissionAmount)}`} />
                <Row
                  label="Net to merchant"
                  value={
                    <span className="font-semibold text-foreground">
                      {formatGEL(t.amount - t.commissionAmount)}
                    </span>
                  }
                />
              </dl>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Related transactions · {t.terminalId}
              </h4>
              <ul className="space-y-1.5">
                {(related.data ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-card-elevated px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{r.id}</span>
                    <span className="text-muted-foreground">{formatGEL(r.amount)}</span>
                    <StatusText status={r.status} className="text-xs" />
                  </li>
                ))}
                {related.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No other transactions.</p>
                )}
              </ul>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}

function TimelineItem({
  label,
  at,
  done,
  last,
}: {
  label: string;
  at: string;
  done: boolean;
  last: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 size-2.5 rounded-full ${done ? 'bg-success' : 'bg-warning'}`}
        />
        {!last && <span className="w-px flex-1 bg-border" />}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{at}</p>
      </div>
    </li>
  );
}
