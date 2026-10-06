import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { endOfDay, format, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarRange, Download, X } from 'lucide-react';
import { PAYMENT_STATUSES, type TransactionListItem } from '@/types';
import {
  useExportTransactions,
  useTransaction,
  useTransactions,
  type TxFilters,
} from '@/features/transactions/api';
import { useMerchantOptions } from '@/features/merchants/api';
import { useTerminals } from '@/features/terminals/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { listSearchParams, optionalParam } from '@/lib/search-params';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { SectionCard } from '@/components/shared/SectionCard';
import { SearchInput } from '@/components/shared/SearchInput';
import { OptionSelect, enumOptions } from '@/components/shared/OptionSelect';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { DetailList, DetailRow } from '@/components/shared/DetailList';
import { col } from '@/components/shared/columns';

const STATUS_OPTIONS = enumOptions(PAYMENT_STATUSES);

const searchSchema = z.object({
  ...listSearchParams,
  dateFrom: optionalParam(z.string()),
  dateTo: optionalParam(z.string()),
  status: optionalParam(z.enum(PAYMENT_STATUSES)),
  merchantId: optionalParam(z.string()),
  terminalId: optionalParam(z.string()),
  /** id of the transaction open in the detail sheet */
  tx: optionalParam(z.string()),
});

export const Route = createFileRoute('/_app/transactions')({
  validateSearch: searchSchema,
  component: TransactionsPage,
});

const columns: ColumnDef<TransactionListItem>[] = [
  col.date('createdAt', 'Date / time'),
  col.text('merchantName', 'Merchant', { strong: true }),
  col.text('terminalReferenceId', 'Terminal'),
  col.money('amount', 'Amount', 'currencyCode'),
  {
    accessorKey: 'isIntegrated',
    header: 'Type',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.isIntegrated ? 'Integrated' : 'Standalone'}
      </span>
    ),
  },
  col.status('status'),
];

function TransactionsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { tx, page = 1, ...filters } = Route.useSearch();
  const query = useTransactions({ ...filters, page });
  const exportTx = useExportTransactions();
  const merchants = useMerchantOptions();
  const terminals = useTerminals({ merchantId: filters.merchantId, page: 1, pageSize: 200 });

  const patchSearch = (patch: Partial<TxFilters>) =>
    void navigate({
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace: true,
    });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="All palm payment operations"
        actions={
          <LoadingButton
            variant="outline"
            pending={exportTx.isPending}
            icon={<Download className="size-4" />}
            onClick={() => exportTx.mutate(filters)}
          >
            Export CSV
          </LoadingButton>
        }
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search amount, idempotency key, batch..."
            value={filters.search ?? ''}
            onChange={(search) => patchSearch({ search: search || undefined })}
          />
          <DateRangeFilter
            from={filters.dateFrom}
            to={filters.dateTo}
            onChange={(dateFrom, dateTo) => patchSearch({ dateFrom, dateTo })}
          />
          <OptionSelect
            value={filters.status}
            onChange={(status) => patchSearch({ status })}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
          />
          <OptionSelect
            value={filters.merchantId}
            onChange={(merchantId) => patchSearch({ merchantId, terminalId: undefined })}
            options={(merchants.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
            allLabel="All merchants"
            className="w-52"
          />
          <OptionSelect
            value={filters.terminalId}
            onChange={(terminalId) => patchSearch({ terminalId })}
            options={(terminals.data?.items ?? []).map((t) => ({
              value: t.id,
              label: t.referenceId ?? t.id,
            }))}
            allLabel="All terminals"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ search: { page: 1 }, replace: true })}
            >
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isPending}
          error={query.isError}
          onRetry={() => void query.refetch()}
          pagination={{
            page,
            pageSize: query.data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total: query.data?.totalCount ?? 0,
            onPageChange: (p) => void navigate({ search: (prev) => ({ ...prev, page: p }) }),
          }}
          onRowClick={(t) => void navigate({ search: (prev) => ({ ...prev, tx: t.id }) })}
          emptyState={{ title: 'No transactions match these filters' }}
        />
      </SectionCard>

      <TxDetailSheet
        txId={tx ?? null}
        onClose={() => void navigate({ search: (prev) => ({ ...prev, tx: undefined }) })}
      />
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
              onChange(startOfDay(range.from).toISOString(), endOfDay(range.to).toISOString());
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

const mono = 'break-all font-mono text-xs';

function TxDetailSheet({ txId, onClose }: { txId: string | null; onClose: () => void }) {
  const tx = useTransaction(txId);
  const t = tx.data;

  return (
    <Sheet open={Boolean(txId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="break-all font-mono text-base">{txId}</SheetTitle>
          <SheetDescription>
            {t
              ? formatDateTime(t.createdAt)
              : tx.isError
                ? 'Failed to load transaction'
                : 'Loading transaction…'}
          </SheetDescription>
        </SheetHeader>

        {tx.isError && (
          <div className="px-4">
            <ErrorState onRetry={() => void tx.refetch()} />
          </div>
        )}

        {t && (
          <div className="space-y-6 px-4 pb-6">
            <div className="rounded-xl bg-card-elevated p-4 text-center">
              <p className="text-3xl font-bold text-foreground">
                {formatMoney(t.amount, t.currencyCode)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-3">
                <StatusText status={t.status} withDot />
                <span className="text-sm text-muted-foreground">
                  {t.isIntegrated ? 'Integrated' : 'Standalone'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Details</h4>
              <DetailList variant="inline">
                <DetailRow label="Merchant">
                  {t.merchantId ? (
                    <Link
                      to="/merchants/$merchantId"
                      params={{ merchantId: t.merchantId }}
                      className="text-info hover:underline"
                    >
                      {t.merchantName ?? t.merchantId}
                    </Link>
                  ) : (
                    t.merchantName
                  )}
                </DetailRow>
                <DetailRow label="Terminal">
                  <Link
                    to="/terminals/$terminalId"
                    params={{ terminalId: t.terminalId }}
                    className="text-info hover:underline"
                  >
                    {t.terminalReferenceId ?? t.terminalId}
                  </Link>
                </DetailRow>
                <DetailRow label="Currency">{t.currencyCode}</DetailRow>
                <DetailRow label="Last event">{statusLabel(t.lastReceivedEventType)}</DetailRow>
                {t.batchNumber != null && <DetailRow label="Batch">{t.batchNumber}</DetailRow>}
                {t.palmId && (
                  <DetailRow label="Palm ID">
                    <span className={mono}>{t.palmId}</span>
                  </DetailRow>
                )}
                {t.idempotencyKey && (
                  <DetailRow label="Idempotency key">
                    <span className={mono}>{t.idempotencyKey}</span>
                  </DetailRow>
                )}
              </DetailList>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-foreground">Timestamps</h4>
              <DetailList variant="inline">
                <DetailRow label="Created">{formatDateTime(t.createdAt)}</DetailRow>
                {t.updatedAt && <DetailRow label="Updated">{formatDateTime(t.updatedAt)}</DetailRow>}
                <DetailRow label="Expires">{formatDateTime(t.expiresAt)}</DetailRow>
              </DetailList>
            </div>

            {t.additionalInfo && (
              <>
                <Separator />
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-foreground">Additional info</h4>
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-card-elevated p-3 font-mono text-xs text-muted-foreground">
                    {t.additionalInfo}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
