import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import type { MerchantAnalyticsItem, TerminalAnalyticsItem } from '@/types';
import {
  useAnalyticsByMerchant,
  useAnalyticsByTerminal,
  useAnalyticsOverview,
  useAnalyticsTimeSeries,
  type Granularity,
} from '@/features/analytics/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/api-client';
import { formatChange, formatGEL, formatNumber, formatPercent } from '@/lib/format';
import { optionalParam } from '@/lib/search-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/shared/DataTable';
import { SectionCard } from '@/components/shared/SectionCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { col } from '@/components/shared/columns';
import { PeriodPicker, type PeriodValue } from '@/components/shared/PeriodPicker';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { CHART_COLORS } from '@/components/charts/chart-theme';

const searchSchema = z.object({
  period: optionalParam(z.enum(['today', '7d', '30d', 'custom'])),
  from: optionalParam(z.string()),
  to: optionalParam(z.string()),
  tab: optionalParam(z.string()),
  granularity: optionalParam(z.enum(['hourly', 'daily'])),
});

export const Route = createFileRoute('/_app/analytics')({
  validateSearch: searchSchema,
  component: AnalyticsPage,
});

const GRANULARITIES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
] as const;

const deltaText = (change: number | undefined) =>
  `${formatChange(change ?? 0)} vs previous period`;

type MetricRow = MerchantAnalyticsItem | TerminalAnalyticsItem;

/** Metric columns shared by the merchant and terminal breakdowns. */
function metricColumns<T extends MetricRow>(): ColumnDef<T>[] {
  return [
    col.number<T>('transactionCount', 'Transactions'),
    col.number<T>('failedCount', 'Failed', { tone: 'destructive' }),
    col.percent<T>('successRate', 'Success rate'),
    col.money<T>('averageTicket', 'Avg ticket'),
    {
      accessorKey: 'totalVolume',
      header: 'Turnover',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatGEL(row.original.totalVolume, { compact: true })}
        </span>
      ),
    },
  ];
}

const merchantColumns: ColumnDef<MerchantAnalyticsItem>[] = [
  col.text<MerchantAnalyticsItem>('merchantName', 'Merchant', { strong: true }),
  ...metricColumns<MerchantAnalyticsItem>(),
];

const terminalColumns: ColumnDef<TerminalAnalyticsItem>[] = [
  col.text<TerminalAnalyticsItem>('referenceId', 'Terminal', { strong: true }),
  col.text<TerminalAnalyticsItem>('merchantName', 'Merchant'),
  ...metricColumns<TerminalAnalyticsItem>(),
];

function AnalyticsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const tab = search.tab ?? 'overview';
  const granularity: Granularity = search.granularity ?? 'daily';

  // Stable object: it is part of every React Query key below.
  const periodValue = useMemo<PeriodValue>(
    () => ({ period: search.period ?? '30d', from: search.from, to: search.to }),
    [search.period, search.from, search.to],
  );

  const [merchantPage, setMerchantPage] = useState(1);
  const [terminalPage, setTerminalPage] = useState(1);

  const overview = useAnalyticsOverview(periodValue);
  const series = useAnalyticsTimeSeries(periodValue, granularity);
  const byMerchant = useAnalyticsByMerchant(periodValue, merchantPage);
  const byTerminal = useAnalyticsByTerminal(periodValue, terminalPage);

  const o = overview.data;
  const points = (series.data ?? []).map((d) => ({
    label: d.label ?? '',
    volume: d.volume,
    transactionCount: d.transactionCount,
    failRate: d.transactionCount
      ? Number(((d.failedCount / d.transactionCount) * 100).toFixed(2))
      : 0,
  }));
  const seriesState = {
    loading: series.isPending,
    error: series.isError,
    onRetry: () => void series.refetch(),
    empty: points.length === 0,
  };

  return (
    <>
      <PageHeader
        title="Analytics & Turnover"
        description="Financial performance across merchants and terminals"
        actions={
          <PeriodPicker
            value={periodValue}
            onChange={(v) => {
              setMerchantPage(1);
              setTerminalPage(1);
              void navigate({
                search: (prev) => ({ ...prev, period: v.period, from: v.from, to: v.to }),
                replace: true,
              });
            }}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total turnover"
          loading={overview.isPending}
          value={formatGEL(o?.totalVolume ?? 0, { compact: true })}
          delta={deltaText(o?.comparedToPrevious?.volumeChange)}
          deltaTone={(o?.comparedToPrevious?.volumeChange ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Transactions"
          loading={overview.isPending}
          value={formatNumber(o?.totalTransactions ?? 0)}
          delta={deltaText(o?.comparedToPrevious?.countChange)}
          deltaTone={(o?.comparedToPrevious?.countChange ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Average ticket"
          loading={overview.isPending}
          value={formatGEL(o?.averageTicket ?? 0)}
          delta={`${formatNumber(o?.successfulTransactions ?? 0)} successful`}
        />
        <StatCard
          label="Success / fail rate"
          loading={overview.isPending}
          value={formatPercent(o?.successRate ?? 0)}
          delta={`${formatPercent(o?.failRate ?? 0, 2)} failed · ${formatNumber(o?.failedTransactions ?? 0)} ops`}
          deltaTone={(o?.failRate ?? 0) > 5 ? 'negative' : 'neutral'}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          void navigate({ search: (prev) => ({ ...prev, tab: v }), replace: true })
        }
        className="gap-6"
      >
        <TabsList className="rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="merchants" className="rounded-lg">By Merchant</TabsTrigger>
          <TabsTrigger value="terminals" className="rounded-lg">By Terminal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ChartCard
            title="Turnover"
            height={280}
            {...seriesState}
            actions={
              <SegmentedControl<Granularity>
                options={GRANULARITIES}
                value={granularity}
                onChange={(g) =>
                  void navigate({ search: (prev) => ({ ...prev, granularity: g }), replace: true })
                }
              />
            }
          >
            <AreaVolumeChart data={points} xKey="label" height={280} />
          </ChartCard>
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Transaction count" height={240} {...seriesState}>
              <SimpleBarChart
                data={points}
                xKey="label"
                yKey="transactionCount"
                height={240}
                color={CHART_COLORS.violet}
              />
            </ChartCard>
            <ChartCard title="Fail rate" height={240} {...seriesState}>
              <SimpleLineChart
                data={points}
                xKey="label"
                yKey="failRate"
                height={240}
                color={CHART_COLORS.destructive}
                yFormatter={(v) => `${v}%`}
              />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="merchants">
          <SectionCard title="Merchants">
            <DataTable
              columns={merchantColumns}
              data={byMerchant.data?.items ?? []}
              loading={byMerchant.isPending}
              error={byMerchant.isError}
              onRetry={() => void byMerchant.refetch()}
              pagination={{
                page: merchantPage,
                pageSize: DEFAULT_PAGE_SIZE,
                total: byMerchant.data?.totalCount ?? 0,
                onPageChange: setMerchantPage,
              }}
              emptyState={{ title: 'No data for this period' }}
            />
          </SectionCard>
        </TabsContent>

        <TabsContent value="terminals">
          <SectionCard title="Terminals">
            <DataTable
              columns={terminalColumns}
              data={byTerminal.data?.items ?? []}
              loading={byTerminal.isPending}
              error={byTerminal.isError}
              onRetry={() => void byTerminal.refetch()}
              pagination={{
                page: terminalPage,
                pageSize: DEFAULT_PAGE_SIZE,
                total: byTerminal.data?.totalCount ?? 0,
                onPageChange: setTerminalPage,
              }}
              emptyState={{ title: 'No data for this period' }}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
