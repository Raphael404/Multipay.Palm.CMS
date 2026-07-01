import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { TxFailureReason } from '@/types';
import { TxMiniTable } from '@/features/transactions/components/TxMiniTable';
import { formatNumber, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { statusLabel } from '@/components/shared/StatusText';
import { SimpleBarChart } from '@/components/charts/SimpleBarChart';
import { SimpleLineChart } from '@/components/charts/SimpleLineChart';
import { CHART_COLORS } from '@/components/charts/chart-theme';

export const Route = createFileRoute('/_app/failed-transactions')({
  component: FailedTxPage,
});

interface FailedSummary {
  failedCount: number;
  totalCount: number;
  failRate: number;
  threshold: number;
  topReason: { reason: TxFailureReason; count: number };
}

function FailedTxPage() {
  const summary = useQuery({
    queryKey: ['failed', 'summary'],
    queryFn: () => api.get<FailedSummary>('/failed-transactions/summary'),
    refetchInterval: 30_000,
  });
  const byReason = useQuery({
    queryKey: ['failed', 'by-reason'],
    queryFn: () =>
      api.get<{ reason: string; count: number }[]>('/failed-transactions/by-reason'),
  });
  const rateOverTime = useQuery({
    queryKey: ['failed', 'rate-over-time'],
    queryFn: () =>
      api.get<{ date: string; failRate: number }[]>('/failed-transactions/rate-over-time'),
  });

  const s = summary.data;
  const overThreshold = (s?.failRate ?? 0) > (s?.threshold ?? 5);

  return (
    <>
      <PageHeader
        title="Failed Transactions"
        description="Monitoring of declined and failed payment operations (last 7 days)"
      />

      {overThreshold && (
        <Card className="flex flex-row items-center gap-4 rounded-2xl border-destructive/40 bg-destructive/10 p-5">
          <ShieldAlert className="size-6 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Failure rate above threshold</p>
            <p className="text-sm text-muted-foreground">
              Current fail rate {formatPercent(s?.failRate ?? 0)} exceeds the {s?.threshold}%
              alert threshold. A critical alert has been raised.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/alerts">
              Open alerts <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Failed operations (7d)"
          icon={<AlertTriangle className="size-4" />}
          loading={summary.isPending}
          value={<span className="text-destructive">{formatNumber(s?.failedCount ?? 0)}</span>}
          delta={`of ${formatNumber(s?.totalCount ?? 0)} total`}
        />
        <StatCard
          label="Fail rate"
          loading={summary.isPending}
          value={formatPercent(s?.failRate ?? 0, 2)}
          delta={`alert threshold ${s?.threshold ?? 5}%`}
          deltaTone={overThreshold ? 'negative' : 'positive'}
        />
        <StatCard
          label="Top failure reason"
          loading={summary.isPending}
          value={
            <span className="text-2xl">{statusLabel(s?.topReason?.reason ?? '—')}</span>
          }
          delta={`${s?.topReason?.count ?? 0} occurrences`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl p-6">
          <h2 className="mb-3 font-semibold text-foreground">Failures by reason</h2>
          {byReason.isPending ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <SimpleBarChart
              data={(byReason.data ?? []).map((d) => ({ ...d, reason: statusLabel(d.reason) }))}
              xKey="reason"
              yKey="count"
              color={CHART_COLORS.destructive}
              layout="vertical"
            />
          )}
        </Card>
        <Card className="rounded-2xl p-6">
          <h2 className="mb-3 font-semibold text-foreground">Fail rate over time</h2>
          {rateOverTime.isPending ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <SimpleLineChart
              data={rateOverTime.data ?? []}
              xKey="date"
              yKey="failRate"
              color={CHART_COLORS.warning}
              yFormatter={(v) => `${v}%`}
              referenceY={s?.threshold ?? 5}
              referenceLabel="threshold"
            />
          )}
        </Card>
      </div>

      <Card className="rounded-2xl p-6">
        <h2 className="mb-4 font-semibold text-foreground">Failed transactions</h2>
        <TxMiniTable filters={{ status: ['failed'] }} pageSize={10} />
      </Card>
    </>
  );
}
