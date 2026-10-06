import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowRight,
  CreditCard,
  Download,
  Fingerprint,
  Store,
  TabletSmartphone,
  UsersRound,
} from 'lucide-react';
import {
  useHourlyVolume,
  useKpis,
  useRecentTransactions,
  useSuccessRatio,
  useTopMerchants,
} from '@/features/dashboard/api';
import { useExportTransactions } from '@/features/transactions/api';
import { formatGEL, formatNumber, formatPercent } from '@/lib/format';
import type { RatioItem, RecentTransaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusText } from '@/components/shared/StatusText';
import { DataTable } from '@/components/shared/DataTable';
import { SectionCard } from '@/components/shared/SectionCard';
import { ChartCard } from '@/components/shared/ChartCard';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { col } from '@/components/shared/columns';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';
import { DonutRatio } from '@/components/charts/DonutRatio';

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
});

/** Maps the API's ratio labels onto the donut's colour keys. */
function ratioKey(item: RatioItem): string {
  const label = (item.label ?? '').toLowerCase();
  if (label.includes('fail')) return 'failed';
  if (label.includes('success') || label.includes('complete')) return 'success';
  if (label.includes('pend')) return 'pending';
  if (label.includes('refund')) return 'refunded';
  return label || 'unknown';
}

const txColumns: ColumnDef<RecentTransaction>[] = [
  col.date('timestamp', 'Time'),
  col.text('merchantName', 'Merchant', { strong: true }),
  col.text('terminalSerialNumber', 'Terminal'),
  col.money('amount', 'Amount', 'currencyCode'),
  col.status('status'),
];

function DashboardPage() {
  const navigate = useNavigate();
  const kpis = useKpis();
  const hourly = useHourlyVolume();
  const ratio = useSuccessRatio();
  const topMerchants = useTopMerchants(5);
  const recentTx = useRecentTransactions(10);
  const exportTx = useExportTransactions();

  const k = kpis.data;
  const loading = kpis.isPending;

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Real-time overview of the Palm Pay payment infrastructure"
      />

      {/* primary KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Palm Terminals"
          icon={<TabletSmartphone className="size-4" />}
          loading={loading}
          value={formatNumber(k?.activeTerminals ?? 0)}
        />
        <StatCard
          label="Today Volume"
          icon={<CreditCard className="size-4" />}
          loading={loading}
          value={formatGEL(k?.todayVolume ?? 0, { compact: true })}
        />
        <StatCard
          label="Successful Transactions"
          icon={<Fingerprint className="size-4" />}
          loading={loading}
          value={formatPercent(k?.successRate ?? 0)}
        />
        <StatCard
          label="Registered Users"
          icon={<UsersRound className="size-4" />}
          loading={loading}
          value={formatNumber(k?.registeredUsers ?? 0)}
        />
      </div>

      {/* secondary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          size="sm"
          label="Turnover (30d)"
          loading={loading}
          value={formatGEL(k?.turnover30d ?? 0, { compact: true })}
        />
        <StatCard
          size="sm"
          label="Failed operations (30d)"
          loading={loading}
          value={<span className="text-destructive">{formatNumber(k?.failedOperations30d ?? 0)}</span>}
        />
        <StatCard
          size="sm"
          label="Active merchants"
          loading={loading}
          value={formatNumber(k?.activeMerchants ?? 0)}
        />
        <StatCard
          size="sm"
          label="Avg transaction"
          loading={loading}
          value={formatGEL(k?.averageTransaction ?? 0)}
        />
        <StatCard
          size="sm"
          label="Terminals on/off"
          loading={loading}
          value={
            <>
              <span className="text-success">{k?.terminalsOnline ?? 0}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive">{k?.terminalsOffline ?? 0}</span>
            </>
          }
        />
      </div>

      {/* charts */}
      <div className="grid gap-4 xl:grid-cols-5">
        <ChartCard
          title="Hourly Volume"
          description="Today, by hour"
          className="xl:col-span-3"
          loading={hourly.isPending}
          error={hourly.isError}
          onRetry={() => void hourly.refetch()}
          empty={(hourly.data ?? []).length === 0}
        >
          <AreaVolumeChart data={hourly.data ?? []} xKey="hour" />
        </ChartCard>
        <ChartCard
          title="Success / Fail Ratio"
          className="xl:col-span-2"
          loading={ratio.isPending}
          error={ratio.isError}
          onRetry={() => void ratio.refetch()}
          empty={(ratio.data?.items ?? []).length === 0}
        >
          <DonutRatio
            data={(ratio.data?.items ?? []).map((i) => ({ status: ratioKey(i), count: i.count }))}
            height={220}
          />
        </ChartCard>
      </div>

      {/* merchant activity */}
      <SectionCard
        title="Merchant Activity"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/merchants">
              View All <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      >
        <ul className="grid gap-2 lg:grid-cols-2">
          {topMerchants.isPending
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
              ))
            : (topMerchants.data ?? []).map((m) => (
                <li key={m.merchantId}>
                  <Link
                    to="/merchants/$merchantId"
                    params={{ merchantId: m.merchantId }}
                    className="flex items-center gap-4 rounded-xl bg-card-elevated p-4 transition-colors hover:bg-card-elevated/70"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-card">
                      <Store className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {m.merchantName ?? '—'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {m.activeTerminals} active terminals ·{' '}
                        <StatusText status={m.status} className="text-sm" />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatGEL(m.todayRevenue, { compact: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">today</p>
                    </div>
                  </Link>
                </li>
              ))}
          {!topMerchants.isPending && (topMerchants.data ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">No merchant activity yet.</li>
          )}
        </ul>
      </SectionCard>

      {/* recent transactions */}
      <SectionCard
        title="Recent Transactions"
        actions={
          <>
            <LoadingButton
              variant="outline"
              size="sm"
              pending={exportTx.isPending}
              icon={<Download className="size-4" />}
              onClick={() => exportTx.mutate({})}
            >
              Export CSV
            </LoadingButton>
            <Button variant="outline" size="sm" asChild>
              <Link to="/transactions">
                View All <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      >
        <DataTable
          columns={txColumns}
          data={recentTx.data ?? []}
          loading={recentTx.isPending}
          error={recentTx.isError}
          onRetry={() => void recentTx.refetch()}
          onRowClick={(tx) => void navigate({ to: '/transactions', search: { tx: tx.id } })}
          emptyState={{ title: 'No transactions yet' }}
        />
      </SectionCard>
    </>
  );
}
