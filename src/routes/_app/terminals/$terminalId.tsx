import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Cpu,
  Link2,
  MapPin,
  RefreshCcw,
  Unplug,
  Wifi,
  Wrench,
} from 'lucide-react';
import { useTerminal, useUpdateTerminal } from '@/features/terminals/api';
import { useMerchantOptions } from '@/features/merchants/api';
import { TxMiniTable } from '@/features/transactions/components/TxMiniTable';
import { formatDate, formatDateTime, formatTimeAgo } from '@/lib/format';
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
import { StatusText, statusLabel } from '@/components/shared/StatusText';
import { Can } from '@/components/shared/Can';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/terminals/$terminalId')({
  component: TerminalDetailPage,
});

const EVENT_ICONS: Record<string, typeof Wifi> = {
  installed: Cpu,
  status_change: RefreshCcw,
  disconnect: Unplug,
  reconnect: Wifi,
  firmware_update: Cpu,
  maintenance: Wrench,
  assignment: Link2,
};

function TerminalDetailPage() {
  const { terminalId } = Route.useParams();
  const query = useTerminal(terminalId);
  const merchants = useMerchantOptions();
  const update = useUpdateTerminal(terminalId);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);

  if (query.isError) {
    return <ErrorState message="Terminal not found." onRetry={() => void query.refetch()} />;
  }

  const t = query.data;
  const merchant = merchants.data?.find((m) => m.id === t?.merchantId);

  return (
    <>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/terminals">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        {t ? (
          <PageHeader
            title={t.id}
            description={`Serial ${t.serialNumber} · firmware ${t.firmwareVersion}`}
            actions={<StatusText status={t.status} withDot className="text-base" />}
          />
        ) : (
          <Skeleton className="h-10 w-72" />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="gap-4 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground">Terminal info</h3>
          {t ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Merchant</dt>
                <dd className="font-medium text-foreground">
                  {merchant ? (
                    <Link
                      to="/merchants/$merchantId"
                      params={{ merchantId: merchant.id }}
                      className="text-info hover:underline"
                    >
                      {merchant.name}
                    </Link>
                  ) : (
                    'Unassigned'
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="flex items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span className="max-w-48 truncate">{t.locationAddress}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Installed</dt>
                <dd className="font-medium text-foreground">{formatDate(t.installedAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Last seen</dt>
                <dd className="font-medium text-foreground">{formatTimeAgo(t.lastSeenAt)}</dd>
              </div>
            </dl>
          ) : (
            <Skeleton className="h-40 w-full" />
          )}

          <Can permission="terminals.write">
            <div className="space-y-1.5 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Assign to merchant</p>
              <Select
                value={t?.merchantId ?? 'none'}
                onValueChange={(v) => setAssignTarget(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(merchants.data ?? [])
                    .filter((m) => m.status === 'active')
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </Can>
        </Card>

        <Card className="gap-4 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground">Uptime (30 days)</h3>
          {t ? (
            <>
              <p
                className={cn(
                  'text-4xl font-bold',
                  t.uptimePercent30d >= 99
                    ? 'text-success'
                    : t.uptimePercent30d >= 95
                      ? 'text-warning'
                      : 'text-destructive',
                )}
              >
                {t.uptimePercent30d.toFixed(2)}%
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-card-elevated">
                <div
                  className={cn(
                    'h-full rounded-full',
                    t.uptimePercent30d >= 99
                      ? 'bg-success'
                      : t.uptimePercent30d >= 95
                        ? 'bg-warning'
                        : 'bg-destructive',
                  )}
                  style={{ width: `${t.uptimePercent30d}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t.status === 'online'
                  ? 'Terminal is currently connected and processing payments.'
                  : `Terminal is ${statusLabel(t.status).toLowerCase()}.`}
              </p>
            </>
          ) : (
            <Skeleton className="h-28 w-full" />
          )}
        </Card>

        <Card className="gap-4 rounded-2xl p-6 xl:row-span-2">
          <h3 className="font-semibold text-foreground">Activity history</h3>
          {t ? (
            <ol className="max-h-[560px] space-y-0 overflow-y-auto pr-2">
              {[...t.activityLog].reverse().map((event, i, arr) => {
                const Icon = EVENT_ICONS[event.event] ?? RefreshCcw;
                return (
                  <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-card-elevated">
                        <Icon className="size-3.5 text-info" />
                      </span>
                      {i < arr.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {event.detail ?? statusLabel(event.event)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Skeleton className="h-72 w-full" />
          )}
        </Card>

        <Card className="rounded-2xl p-6 xl:col-span-2">
          <h3 className="mb-4 font-semibold text-foreground">Recent transactions</h3>
          <TxMiniTable filters={{ terminalId }} pageSize={8} />
        </Card>
      </div>

      <ConfirmDialog
        open={assignTarget !== null}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        title="Change merchant assignment?"
        description={
          assignTarget === 'none'
            ? `${terminalId} will be detached from its merchant.`
            : `${terminalId} will be assigned to ${
                merchants.data?.find((m) => m.id === assignTarget)?.name ?? assignTarget
              }. This is recorded in the audit log.`
        }
        confirmLabel="Confirm assignment"
        pending={update.isPending}
        onConfirm={() => {
          update.mutate(
            { merchantId: assignTarget === 'none' ? null : assignTarget },
            { onSettled: () => setAssignTarget(null) },
          );
        }}
      />
    </>
  );
}
