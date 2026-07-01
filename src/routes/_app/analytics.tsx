import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { api } from '@/lib/api-client';
import { formatGEL, formatNumber, formatPercent } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusText } from '@/components/shared/StatusText';
import { DataTable } from '@/components/shared/DataTable';
import {
  PeriodPicker,
  usePeriodRange,
  type PeriodValue,
} from '@/components/shared/PeriodPicker';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { CHART_COLORS } from '@/components/charts/chart-theme';

const searchSchema = z.object({
  period: z.enum(['today', '7d', '30d', 'custom']).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  tab: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/analytics')({
  validateSearch: searchSchema,
  component: AnalyticsPage,
});

interface AnalyticsSummary {
  turnover: number;
  turnoverDeltaPct: number;
  txCount: number;
  txCountDeltaPct: number;
  avgTicket: number;
  failRate: number;
  commission: number;
}

interface MerchantRow {
  merchantId: string;
  merchantName: string;
  commissionRate: number;
  volume: number;
  count: number;
  commission: number;
  avgTicket: number;
}

interface TerminalRow {
  terminalId: string;
  merchantName: string;
  location: string;
  status: string;
  volume: number;
  count: number;
}

function AnalyticsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const periodValue: PeriodValue = {
    period: search.period ?? '30d',
    from: search.from,
    to: search.to,
  };
  const range = usePeriodRange(periodValue);
  const tab = search.tab ?? 'overview';

  const summary = useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: () => api.get<AnalyticsSummary>('/analytics/summary', range),
  });
  const series = useQuery({
    queryKey: ['analytics', 'series', range],
    queryFn: () =>
      api.get<{ date: string; volume: number; count: number; failed: number; avgTicket: number }[]>(
        '/analytics/turnover-series',
        range,
      ),
  });
  const byMerchant = useQuery({
    queryKey: ['analytics', 'by-merchant', range],
    queryFn: () => api.get<MerchantRow[]>('/analytics/by-merchant', range),
  });
  const byTerminal = useQuery({
    queryKey: ['analytics', 'by-terminal', range],
    queryFn: () => api.get<TerminalRow[]>('/analytics/by-terminal', range),
  });
  const hourly = useQuery({
    queryKey: ['analytics', 'hourly', range],
    queryFn: () =>
      api.get<{ hour: string; volume: number; count: number }[]>('/analytics/hourly-pattern', range),
  });

  const s = summary.data;
  const failSeries = (series.data ?? []).map((d) => ({
    date: d.date,
    failRatio: d.count + d.failed ? Number(((d.failed / (d.count + d.failed)) * 100).toFixed(2)) : 0,
  }));

  const merchantColumns: ColumnDef<MerchantRow>[] = [
    {
      accessorKey: 'merchantName',
      header: 'Merchant',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.merchantName}</span>
      ),
    },
    { accessorKey: 'count', header: 'Transactions' },
    {
      accessorKey: 'avgTicket',
      header: 'Avg ticket',
      cell: ({ row }) => formatGEL(row.original.avgTicket),
    },
    {
      accessorKey: 'commissionRate',
      header: 'Rate',
      cell: ({ row }) => `${row.original.commissionRate.toFixed(1)}%`,
    },
    {
      accessorKey: 'commission',
      header: 'Commission',
      cell: ({ row }) => formatGEL(row.original.commission),
    },
    {
      accessorKey: 'volume',
      header: 'Turnover',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatGEL(row.original.volume, { compact: true })}
        </span>
      ),
    },
  ];

  const terminalColumns: ColumnDef<TerminalRow>[] = [
    {
      accessorKey: 'terminalId',
      header: 'Terminal',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.terminalId}</span>
      ),
    },
    { accessorKey: 'merchantName', header: 'Merchant' },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <span className="block max-w-52 truncate text-muted-foreground">
          {row.original.location}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
    { accessorKey: 'count', header: 'Transactions' },
    {
      accessorKey: 'volume',
      header: 'Turnover',
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatGEL(row.original.volume, { compact: true })}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics & Turnover"
        description="Financial performance across merchants and terminals"
        actions={
          <PeriodPicker
            value={periodValue}
            onChange={(v) =>
              void navigate({
                search: (prev) => ({ ...prev, period: v.period, from: v.from, to: v.to }),
                replace: true,
              })
            }
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total turnover"
          loading={summary.isPending}
          value={formatGEL(s?.turnover ?? 0, { compact: true })}
          delta={`${(s?.turnoverDeltaPct ?? 0) >= 0 ? '+' : ''}${formatPercent(s?.turnoverDeltaPct ?? 0)} vs previous period`}
          deltaTone={(s?.turnoverDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Transactions"
          loading={summary.isPending}
          value={formatNumber(s?.txCount ?? 0)}
          delta={`${(s?.txCountDeltaPct ?? 0) >= 0 ? '+' : ''}${formatPercent(s?.txCountDeltaPct ?? 0)} vs previous period`}
          deltaTone={(s?.txCountDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Average ticket"
          loading={summary.isPending}
          value={formatGEL(s?.avgTicket ?? 0)}
        />
        <StatCard
          label="Fail rate"
          loading={summary.isPending}
          value={formatPercent(s?.failRate ?? 0, 2)}
          deltaTone={(s?.failRate ?? 0) > 5 ? 'negative' : 'positive'}
          delta={(s?.failRate ?? 0) > 5 ? 'above threshold' : 'within normal range'}
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
          <TabsTrigger value="hourly" className="rounded-lg">Hourly / Daily</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="rounded-2xl p-6">
            <h2 className="mb-3 font-semibold text-foreground">Turnover</h2>
            {series.isPending ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <AreaVolumeChart data={series.data ?? []} xKey="date" height={280} />
            )}
          </Card>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-2xl p-6">
              <h2 className="mb-3 font-semibold text-foreground">Average ticket size</h2>
              {series.isPending ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <SimpleLineChart
                  data={series.data ?? []}
                  xKey="date"
                  yKey="avgTicket"
                  height={240}
                  color={CHART_COLORS.violet}
                  yFormatter={(v) => formatGEL(v)}
                />
              )}
            </Card>
            <Card className="rounded-2xl p-6">
              <h2 className="mb-3 font-semibold text-foreground">Failed / success ratio</h2>
              {series.isPending ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (
                <SimpleLineChart
                  data={failSeries}
                  xKey="date"
                  yKey="failRatio"
                  height={240}
                  color={CHART_COLORS.destructive}
                  yFormatter={(v) => `${v}%`}
                />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchants" className="space-y-4">
          <Card className="rounded-2xl p-6">
            <h2 className="mb-3 font-semibold text-foreground">Top merchants by turnover</h2>
            {byMerchant.isPending ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <SimpleBarChart
                data={(byMerchant.data ?? []).slice(0, 10).map((m) => ({
                  name: m.merchantName,
                  volume: m.volume,
                }))}
                xKey="name"
                yKey="volume"
                layout="vertical"
                height={320}
                yFormatter={(v) => formatGEL(v, { compact: true })}
              />
            )}
          </Card>
          <Card className="rounded-2xl p-6">
            <DataTable
              columns={merchantColumns}
              data={byMerchant.data ?? []}
              loading={byMerchant.isPending}
              emptyState={{ title: 'No data for this period' }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="terminals">
          <Card className="rounded-2xl p-6">
            <h2 className="mb-3 font-semibold text-foreground">Top terminals by turnover</h2>
            <DataTable
              columns={terminalColumns}
              data={byTerminal.data ?? []}
              loading={byTerminal.isPending}
              emptyState={{ title: 'No data for this period' }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="hourly">
          <Card className="rounded-2xl p-6">
            <h2 className="mb-1 font-semibold text-foreground">Hourly volume pattern</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Aggregated by hour of day across the selected period
            </p>
            {hourly.isPending ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <SimpleBarChart
                data={hourly.data ?? []}
                xKey="hour"
                yKey="volume"
                height={320}
                yFormatter={(v) => formatGEL(v, { compact: true })}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
