import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '@/lib/api-client';
import type { ExportRecord, Paginated, Transaction } from '@/types';
import { useMerchantOptions } from '@/features/merchants/api';
import { formatDateTime, formatGEL } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Can } from '@/components/shared/Can';
import { statusLabel } from '@/components/shared/StatusText';
import {
  PeriodPicker,
  usePeriodRange,
  type PeriodValue,
} from '@/components/shared/PeriodPicker';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/reports')({
  component: ReportsPage,
});

type ReportType = 'turnover' | 'settlement' | 'failed';

const REPORTS: { type: ReportType; title: string; description: string; icon: typeof BarChart3 }[] = [
  {
    type: 'turnover',
    title: 'Turnover report',
    description: 'Volume, transactions and commission by merchant',
    icon: BarChart3,
  },
  {
    type: 'settlement',
    title: 'Settlement report',
    description: 'Settlement status of successful transactions',
    icon: Landmark,
  },
  {
    type: 'failed',
    title: 'Failed transactions report',
    description: 'All failed operations with error codes and reasons',
    icon: ShieldAlert,
  },
];

interface MerchantAgg {
  merchantId: string;
  merchantName: string;
  volume: number;
  count: number;
  commission: number;
}

function ReportsPage() {
  const queryClient = useQueryClient();
  const merchants = useMerchantOptions();
  const [reportType, setReportType] = useState<ReportType>('turnover');
  const [period, setPeriod] = useState<PeriodValue>({ period: '30d' });
  const [merchantScope, setMerchantScope] = useState<string>('all');
  const range = usePeriodRange(period);

  const scopeLabel =
    merchantScope === 'all'
      ? 'All merchants'
      : (merchants.data?.find((m) => m.id === merchantScope)?.name ?? merchantScope);

  const turnoverPreview = useQuery({
    queryKey: ['reports', 'turnover', range, merchantScope],
    queryFn: () => api.get<MerchantAgg[]>('/analytics/by-merchant', range),
    enabled: reportType === 'turnover',
    select: (rows) =>
      merchantScope === 'all' ? rows : rows.filter((r) => r.merchantId === merchantScope),
  });

  const txPreview = useQuery({
    queryKey: ['reports', 'tx', reportType, range, merchantScope],
    queryFn: () =>
      api.get<Paginated<Transaction>>('/transactions', {
        ...range,
        pageSize: 50,
        status: reportType === 'failed' ? ['failed'] : ['success'],
        merchantId: merchantScope === 'all' ? undefined : [merchantScope],
      }),
    enabled: reportType !== 'turnover',
  });

  const exports = useQuery({
    queryKey: ['reports', 'exports'],
    queryFn: () => api.get<ExportRecord[]>('/reports/exports'),
  });

  const reportMeta = REPORTS.find((r) => r.type === reportType)!;

  const serverExport = useMutation({
    mutationFn: (fmt: 'pdf' | 'xlsx') =>
      api.post('/reports/export', {
        report: reportMeta.title,
        format: fmt,
        scope: `${scopeLabel} — ${format(new Date(range.from), 'dd MMM')} to ${format(new Date(range.to), 'dd MMM yyyy')}`,
      }),
    onSuccess: (_, fmt) => {
      void queryClient.invalidateQueries({ queryKey: ['reports', 'exports'] });
      toast.success(`${fmt.toUpperCase()} export generated`, {
        description: 'Download will start automatically (mock).',
      });
    },
    onError: () => toast.error('Export failed'),
  });

  const exportCsv = () => {
    if (reportType === 'turnover') {
      downloadCsv(
        `turnover-report-${format(new Date(), 'yyyyMMdd')}`,
        (turnoverPreview.data ?? []).map((r) => ({
          merchant: r.merchantName,
          transactions: r.count,
          volume: r.volume,
          commission: r.commission,
        })),
      );
    } else {
      downloadCsv(
        `${reportType}-report-${format(new Date(), 'yyyyMMdd')}`,
        (txPreview.data?.data ?? []).map((t) => ({
          id: t.id,
          occurredAt: t.occurredAt,
          merchantId: t.merchantId,
          terminalId: t.terminalId,
          amount: t.amount,
          status: t.status,
          errorCode: t.errorCode ?? '',
          failureReason: t.failureReason ?? '',
          settlementStatus: t.settlementStatus,
        })),
      );
    }
    void api.post('/reports/export', {
      report: reportMeta.title,
      format: 'csv',
      scope: scopeLabel,
    });
    void queryClient.invalidateQueries({ queryKey: ['reports', 'exports'] });
  };

  const previewLoading = reportType === 'turnover' ? turnoverPreview.isPending : txPreview.isPending;

  return (
    <>
      <PageHeader title="Reports & Export" description="Build, preview and export operational reports" />

      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((r) => (
          <button
            key={r.type}
            onClick={() => setReportType(r.type)}
            className={cn(
              'rounded-2xl border p-5 text-left transition-colors',
              reportType === r.type
                ? 'border-info/60 bg-info/10'
                : 'border-border bg-card hover:bg-card-elevated',
            )}
          >
            <r.icon
              className={cn(
                'mb-3 size-6',
                reportType === r.type ? 'text-info' : 'text-muted-foreground',
              )}
            />
            <p className="font-semibold text-foreground">{r.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
          </button>
        ))}
      </div>

      <Card className="rounded-2xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker value={period} onChange={setPeriod} />
            <Select value={merchantScope} onValueChange={setMerchantScope}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All merchants</SelectItem>
                {(merchants.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Can permission="reports.export" fallback={
            <p className="text-sm text-muted-foreground">Export requires Finance Admin role</p>
          }>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="size-4" /> CSV
              </Button>
              <Button variant="outline" onClick={() => serverExport.mutate('xlsx')} disabled={serverExport.isPending}>
                <FileSpreadsheet className="size-4" /> Excel
              </Button>
              <Button variant="outline" onClick={() => serverExport.mutate('pdf')} disabled={serverExport.isPending}>
                <FileText className="size-4" /> PDF
              </Button>
            </div>
          </Can>
        </div>

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preview · {reportMeta.title} · {scopeLabel}
        </h3>

        {previewLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : reportType === 'turnover' ? (
          (turnoverPreview.data ?? []).length === 0 ? (
            <EmptyState title="No data in this period" />
          ) : (
            <PreviewTable
              headers={['Merchant', 'Transactions', 'Volume', 'Commission']}
              rows={(turnoverPreview.data ?? []).slice(0, 12).map((r) => [
                r.merchantName,
                String(r.count),
                formatGEL(r.volume),
                formatGEL(r.commission),
              ])}
            />
          )
        ) : (txPreview.data?.data ?? []).length === 0 ? (
          <EmptyState title="No data in this period" />
        ) : (
          <PreviewTable
            headers={
              reportType === 'failed'
                ? ['TX ID', 'Date', 'Terminal', 'Amount', 'Error', 'Reason']
                : ['TX ID', 'Date', 'Terminal', 'Amount', 'Settlement', 'Settled at']
            }
            rows={(txPreview.data?.data ?? []).slice(0, 12).map((t) =>
              reportType === 'failed'
                ? [
                    t.id,
                    formatDateTime(t.occurredAt),
                    t.terminalId,
                    formatGEL(t.amount),
                    t.errorCode ?? '—',
                    statusLabel(t.failureReason ?? '—'),
                  ]
                : [
                    t.id,
                    formatDateTime(t.occurredAt),
                    t.terminalId,
                    formatGEL(t.amount),
                    statusLabel(t.settlementStatus),
                    t.settledAt ? formatDateTime(t.settledAt) : '—',
                  ],
            )}
          />
        )}
      </Card>

      <Card className="rounded-2xl p-6">
        <h3 className="mb-4 font-semibold text-foreground">Recent exports</h3>
        {exports.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ul className="space-y-2">
            {(exports.data ?? []).slice(0, 8).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-card-elevated px-4 py-3 text-sm"
              >
                <span className="rounded-md bg-card px-2 py-0.5 font-mono text-xs uppercase text-info">
                  {e.format}
                </span>
                <span className="font-medium text-foreground">{e.report}</span>
                <span className="text-muted-foreground">{e.scope}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(e.at)} · {e.byUser}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-card-elevated/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn('px-4 py-2.5', j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
