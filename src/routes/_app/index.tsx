import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowRight,
  CreditCard,
  Download,
  Fingerprint,
  SlidersHorizontal,
  Store,
  TabletSmartphone,
  UsersRound,
} from 'lucide-react';
import {
  useDashboardSummary,
  useHourlyVolume,
  useStatusRatio,
  useTopMerchants,
} from '@/features/dashboard/api';
import { useTransactions } from '@/features/transactions/api';
import { useMerchantNameMap } from '@/features/merchants/api';
import { useAlertsLatest } from '@/features/alerts/api';
import { formatGEL, formatNumber, formatPercent, formatTimeAgo } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import type { SystemAlert, Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { DataTable } from '@/components/shared/DataTable';
import { AreaVolumeChart } from '@/components/charts/AreaVolumeChart';
import { DonutRatio } from '@/components/charts/DonutRatio';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
});

const ALERT_TILE_CLASSES: Record<SystemAlert['severity'], string> = {
  critical: 'border-destructive/40 bg-destructive/10',
  warning: 'border-warning/40 bg-warning/10',
  info: 'border-info/40 bg-info/10',
  ok: 'border-success/40 bg-success/10',
};

const ALERT_TITLE_CLASSES: Record<SystemAlert['severity'], string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
  ok: 'text-success',
};

function DashboardPage() {
  const navigate = useNavigate();
  const summary = useDashboardSummary();
  const hourly = useHourlyVolume();
  const ratio = useStatusRatio();
  const topMerchants = useTopMerchants();
  const alerts = useAlertsLatest();
  const recentTx = useTransactions({ page: 1, pageSize: 10 }, { refetchInterval: 15_000 });
  const merchantNames = useMerchantNameMap();

  const s = summary.data;

  const txColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'id',
      header: 'Transaction ID',
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.id}</span>,
    },
    {
      accessorKey: 'merchantId',
      header: 'Merchant',
      cell: ({ row }) => merchantNames.get(row.original.merchantId) ?? row.original.merchantId,
    },
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
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          {row.original.method === 'palm_authentication' ? (
            <Fingerprint className="size-4 text-info" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {row.original.method === 'palm_authentication' ? 'Palm' : 'Card fallback'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusText status={row.original.status} withDot />,
    },
  ];

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
          loading={summary.isPending}
          value={formatNumber(s?.activeTerminals ?? 0)}
          delta={`+${s?.terminalsDeltaWeek ?? 0} this week`}
          deltaTone="positive"
        />
        <StatCard
          label="Today Volume"
          icon={<CreditCard className="size-4" />}
          loading={summary.isPending}
          value={formatGEL(s?.todayVolume ?? 0, { compact: true })}
          delta={`${(s?.todayVolumeDeltaPct ?? 0) >= 0 ? '+' : ''}${formatPercent(s?.todayVolumeDeltaPct ?? 0)} vs yesterday`}
          deltaTone={(s?.todayVolumeDeltaPct ?? 0) >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Successful Transactions"
          icon={<Fingerprint className="size-4" />}
          loading={summary.isPending}
          value={formatPercent(s?.successRate24h ?? 0)}
          delta="last 24 hours"
        />
        <StatCard
          label="Registered Users"
          icon={<UsersRound className="size-4" />}
          loading={summary.isPending}
          value={formatNumber(s?.registeredUsers ?? 0)}
          delta={`+${s?.registeredUsersToday ?? 0} today`}
          deltaTone="positive"
        />
      </div>

      {/* secondary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SecondaryStat
          label="Turnover (30d)"
          loading={summary.isPending}
          value={formatGEL(s?.totalTurnover30d ?? 0, { compact: true })}
        />
        <SecondaryStat
          label="Failed operations (30d)"
          loading={summary.isPending}
          value={formatNumber(s?.failedCount30d ?? 0)}
          valueClass="text-destructive"
        />
        <SecondaryStat
          label="Active merchants"
          loading={summary.isPending}
          value={formatNumber(s?.activeMerchants ?? 0)}
        />
        <SecondaryStat
          label="Avg transaction"
          loading={summary.isPending}
          value={formatGEL(s?.avgTransaction30d ?? 0)}
        />
        <SecondaryStat
          label="Terminals on/off"
          loading={summary.isPending}
          value={
            <>
              <span className="text-success">{s?.onlineOfflineSplit.online ?? 0}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive">{s?.onlineOfflineSplit.offline ?? 0}</span>
            </>
          }
        />
      </div>

      {/* charts */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="rounded-2xl p-6 xl:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Hourly Volume</h2>
              <p className="text-sm text-muted-foreground">Today, successful transactions</p>
            </div>
          </div>
          {hourly.isPending ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <AreaVolumeChart data={hourly.data ?? []} xKey="hour" />
          )}
        </Card>
        <Card className="rounded-2xl p-6 xl:col-span-2">
          <h2 className="mb-2 font-semibold text-foreground">Success / Fail Ratio</h2>
          {ratio.isPending ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <DonutRatio data={ratio.data ?? []} height={220} />
          )}
        </Card>
      </div>

      {/* merchant activity + security alerts */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Merchant Activity</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/merchants">
                View All <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="space-y-2">
            {topMerchants.isPending
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
                ))
              : (topMerchants.data ?? []).map((m) => (
                  <li key={m.id}>
                    <Link
                      to="/merchants/$merchantId"
                      params={{ merchantId: m.id }}
                      className="flex items-center gap-4 rounded-xl bg-card-elevated p-4 transition-colors hover:bg-card-elevated/70"
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-card">
                        <Store className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{m.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.activeTerminals} active terminals ·{' '}
                          <StatusText status={m.status} className="text-sm" />
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatGEL(m.todayTurnover, { compact: true })}
                        </p>
                        <p className="text-xs text-muted-foreground">today</p>
                      </div>
                    </Link>
                  </li>
                ))}
          </ul>
        </Card>

        <Card className="rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Security Alerts</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/alerts">
                View All <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="space-y-2.5">
            {alerts.isPending
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
                ))
              : (alerts.data ?? []).slice(0, 4).map((alert) => (
                  <li
                    key={alert.id}
                    className={cn('rounded-xl border p-4', ALERT_TILE_CLASSES[alert.severity])}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('font-semibold', ALERT_TITLE_CLASSES[alert.severity])}>
                        {alert.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimeAgo(alert.at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{alert.description}</p>
                  </li>
                ))}
          </ul>
        </Card>
      </div>

      {/* recent transactions */}
      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  'recent-transactions',
                  (recentTx.data?.data ?? []).map((t) => ({
                    id: t.id,
                    occurredAt: t.occurredAt,
                    merchant: merchantNames.get(t.merchantId) ?? t.merchantId,
                    terminal: t.terminalId,
                    amount: t.amount,
                    method: statusLabel(t.method),
                    status: t.status,
                  })),
                )
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigate({ to: '/transactions' })}
            >
              <SlidersHorizontal className="size-4" /> Advanced Filters
            </Button>
          </div>
        </div>
        <DataTable
          columns={txColumns}
          data={recentTx.data?.data ?? []}
          loading={recentTx.isPending}
          onRowClick={() => void navigate({ to: '/transactions' })}
        />
      </Card>
    </>
  );
}

function SecondaryStat({
  label,
  value,
  loading,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <Card className="gap-1 rounded-2xl p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className={cn('text-xl font-bold text-foreground', valueClass)}>{value}</p>
      )}
    </Card>
  );
}
