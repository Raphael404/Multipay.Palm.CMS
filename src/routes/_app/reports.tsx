import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { BarChart3, Download, Eye, FileDown, Landmark, ShieldAlert } from 'lucide-react';
import type { ReportPreviewRow, ReportRequest, ReportType } from '@/types';
import { useMerchantOptions } from '@/features/merchants/api';
import {
  downloadReport,
  useExportReport,
  usePreviewReport,
  useRecentReports,
} from '@/features/reports/api';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { SectionCard } from '@/components/shared/SectionCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { OptionSelect } from '@/components/shared/OptionSelect';
import { col } from '@/components/shared/columns';
import {
  PeriodPicker,
  usePeriodRange,
  type PeriodValue,
} from '@/components/shared/PeriodPicker';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/reports')({
  component: ReportsPage,
});

const REPORTS: { type: ReportType; title: string; description: string; icon: typeof BarChart3 }[] = [
  {
    type: 'Turnover',
    title: 'Turnover report',
    description: 'Volume and transactions by merchant and terminal',
    icon: BarChart3,
  },
  {
    type: 'Settlement',
    title: 'Settlement report',
    description: 'Settlement of successful transactions',
    icon: Landmark,
  },
  {
    type: 'Failed',
    title: 'Failed transactions report',
    description: 'All failed operations with error codes and reasons',
    icon: ShieldAlert,
  },
];

const REPORT_TITLES = Object.fromEntries(REPORTS.map((r) => [r.type, r.title])) as Record<
  ReportType,
  string
>;

const previewColumns: ColumnDef<ReportPreviewRow>[] = [
  col.date<ReportPreviewRow>('occurredAt', 'Date'),
  col.text<ReportPreviewRow>('merchantName', 'Merchant', { strong: true }),
  col.text<ReportPreviewRow>('terminalReference', 'Terminal', { muted: true }),
  col.money<ReportPreviewRow>('amount', 'Amount', 'currency'),
  col.label<ReportPreviewRow>('status', 'Status'),
  col.mono<ReportPreviewRow>('reference', 'Reference'),
];

function ReportsPage() {
  const merchants = useMerchantOptions();
  const [reportType, setReportType] = useState<ReportType>('Turnover');
  const [period, setPeriod] = useState<PeriodValue>({ period: '30d' });
  const [merchantId, setMerchantId] = useState<string | undefined>();
  const range = usePeriodRange(period);

  const preview = usePreviewReport();
  const exportReport = useExportReport();
  const recent = useRecentReports(10);

  const request: ReportRequest = {
    reportType,
    dateFrom: range.from,
    dateTo: range.to,
    merchantId,
  };

  // Any change to the builder invalidates the shown preview / export.
  const resetResults = () => {
    preview.reset();
    exportReport.reset();
  };

  const merchantOptions = (merchants.data ?? []).map((m) => ({ value: m.id, label: m.name }));
  const scopeLabel = merchantId
    ? (merchantOptions.find((m) => m.value === merchantId)?.label ?? merchantId)
    : 'All merchants';

  const exported = exportReport.data;
  const p = preview.data;

  return (
    <>
      <PageHeader title="Reports & Export" description="Build, preview and export operational reports" />

      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((r) => (
          <button
            key={r.type}
            onClick={() => {
              setReportType(r.type);
              resetResults();
            }}
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

      <SectionCard>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker
              value={period}
              onChange={(v) => {
                setPeriod(v);
                resetResults();
              }}
            />
            <OptionSelect
              value={merchantId}
              onChange={(v) => {
                setMerchantId(v);
                resetResults();
              }}
              options={merchantOptions}
              allLabel="All merchants"
              className="w-56"
            />
          </div>
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              pending={preview.isPending}
              icon={<Eye className="size-4" />}
              onClick={() => preview.mutate(request)}
            >
              Preview
            </LoadingButton>
            <LoadingButton
              pending={exportReport.isPending}
              icon={<FileDown className="size-4" />}
              onClick={() => exportReport.mutate(request)}
            >
              Export
            </LoadingButton>
          </div>
        </div>

        {exported && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm">
            <span className="font-medium text-foreground">
              {exported.fileName ?? 'Report'} is ready
            </span>
            <span className="text-muted-foreground">
              {formatNumber(exported.rowCount)} rows
            </span>
            <Button size="sm" className="ml-auto" onClick={() => void downloadReport(exported)}>
              <Download className="size-4" /> Download
            </Button>
          </div>
        )}

        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Preview · {REPORT_TITLES[reportType]} · {scopeLabel}
        </h3>

        {preview.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : !p ? (
          <EmptyState
            title="No preview yet"
            description="Choose a report, period and merchant, then click Preview."
          />
        ) : p.rows.length === 0 ? (
          <EmptyState title="No data in this period" />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {formatNumber(p.rowCount)} rows · total{' '}
              <span className="font-semibold text-foreground">{formatMoney(p.totalAmount)}</span>
              {p.rows.length < p.rowCount && ` · showing first ${p.rows.length}`}
            </p>
            <DataTable columns={previewColumns} data={p.rows} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent exports">
        {recent.isError ? (
          <ErrorState onRetry={() => void recent.refetch()} />
        ) : recent.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : (recent.data ?? []).length === 0 ? (
          <EmptyState title="No exports yet" />
        ) : (
          <ul className="space-y-2">
            {(recent.data ?? []).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-card-elevated px-4 py-3 text-sm"
              >
                <span className="rounded-md bg-card px-2 py-0.5 font-mono text-xs uppercase text-info">
                  {e.reportType}
                </span>
                <span className="font-medium text-foreground">{e.fileName ?? e.id}</span>
                <span className="text-muted-foreground">
                  {formatDate(e.dateFrom)} – {formatDate(e.dateTo)} ·{' '}
                  {formatNumber(e.rowCount)} rows
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                </span>
                <Button size="sm" variant="outline" onClick={() => void downloadReport(e)}>
                  <Download className="size-4" /> Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
