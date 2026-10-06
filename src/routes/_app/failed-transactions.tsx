import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';
import type { FailedTransactionItem } from '@/types';
import {
  useFailedByReason,
  useFailedMetrics,
  useFailedTimeline,
  useFailedTransactions,
} from '@/features/failed/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { formatChange, formatDate, formatGEL, formatNumber, formatPercent } from '@/lib/format';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { statusLabel } from '@/components/shared/StatusText';
import { SectionCard } from '@/components/shared/SectionCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { col } from '@/components/shared/columns';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { CHART_COLORS } from '@/components/charts/chart-theme';

export const Route = createFileRoute('/_app/failed-transactions')({
  component: FailedTxPage,
});

const DAY_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
] as const;

const columns: ColumnDef<FailedTransactionItem>[] = [
  {
    accessorKey: 'paymentId',
    header: 'Payment ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground">{row.original.paymentId}</span>
    ),
  },
  col.date('failedAt', 'Failed at'),
  col.text('merchantName', 'Merchant'),
  col.text('terminalReferenceId', 'Terminal'),
  col.money('amount', 'Amount', 'currencyCode'),
  col.label('category', 'Reason', { tone: 'destructive' }),
  col.mono('errorCode', 'Error code'),
];

function FailedTxPage() {
  const [days, setDays] = useState<number>(7);
  const [page, setPage] = useState(1);

  const metrics = useFailedMetrics(days);
  const byReason = useFailedByReason(days);
  const timeline = useFailedTimeline(days);
  const list = useFailedTransactions(days, page);

  const m = metrics.data;
  const change = m?.comparedToPreviousPeriod ?? 0;

  return (
    <>
      <PageHeader
        title="Failed Transactions"
        description={`Monitoring of declined and failed payment operations (last ${days} ${days === 1 ? 'day' : 'days'})`}
        actions={
          <SegmentedControl
            options={DAY_OPTIONS}
            value={days}
            onChange={(d) => {
              setDays(d);
              setPage(1);
            }}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Failed operations"
          icon={<AlertTriangle className="size-4" />}
          loading={metrics.isPending}
          value={<span className="text-destructive">{formatNumber(m?.totalFailed ?? 0)}</span>}
          delta={`${formatChange(change)} vs previous period`}
          deltaTone={change > 0 ? 'negative' : change < 0 ? 'positive' : 'neutral'}
        />
        <StatCard
          label="Failure rate"
          loading={metrics.isPending}
          value={formatPercent(m?.failureRate ?? 0, 2)}
        />
        <StatCard
          label="Most common reason"
          loading={metrics.isPending}
          value={<span className="text-2xl">{statusLabel(m?.mostCommonReason)}</span>}
        />
        <StatCard
          label="Affected amount"
          loading={metrics.isPending}
          value={formatGEL(m?.totalAffectedAmount ?? 0, { compact: true })}
          delta={`avg ${formatGEL(m?.averageFailedAmount ?? 0)} per failure`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Failures by reason"
          loading={byReason.isPending}
          error={byReason.isError}
          onRetry={() => void byReason.refetch()}
          empty={(byReason.data ?? []).length === 0}
        >
          <SimpleBarChart
            data={(byReason.data ?? []).map((d) => ({
              reason: d.label ?? statusLabel(d.category),
              count: d.count,
            }))}
            xKey="reason"
            yKey="count"
            color={CHART_COLORS.destructive}
            layout="vertical"
          />
        </ChartCard>
        <ChartCard
          title="Fail rate over time"
          loading={timeline.isPending}
          error={timeline.isError}
          onRetry={() => void timeline.refetch()}
          empty={(timeline.data ?? []).length === 0}
        >
          <SimpleLineChart
            data={(timeline.data ?? []).map((d) => ({
              date: formatDate(d.date, 'dd MMM'),
              failRate: Number(d.failRate.toFixed(2)),
            }))}
            xKey="date"
            yKey="failRate"
            color={CHART_COLORS.warning}
            yFormatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      <SectionCard title="Failed transactions">
        <DataTable
          columns={columns}
          data={list.data?.items ?? []}
          loading={list.isPending}
          error={list.isError}
          onRetry={() => void list.refetch()}
          pagination={{
            page,
            pageSize: DEFAULT_PAGE_SIZE,
            total: list.data?.totalCount ?? 0,
            onPageChange: setPage,
          }}
          emptyState={{ title: 'No failed transactions', description: 'Nothing failed in this period.' }}
        />
      </SectionCard>
    </>
  );
}
