import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { Check, CheckCheck, ExternalLink, RotateCcw } from 'lucide-react';
import type { SystemAlert } from '@/types';
import {
  useAcknowledgeAlert,
  useAcknowledgeAll,
  useAlerts,
} from '@/features/alerts/api';
import { formatTimeAgo } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Can } from '@/components/shared/Can';
import { statusLabel } from '@/components/shared/StatusText';
import { cn } from '@/lib/utils';

const searchSchema = z.object({
  severity: z.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/alerts')({
  validateSearch: searchSchema,
  component: AlertsPage,
});

const SEVERITY_ORDER = ['critical', 'warning', 'info', 'ok'] as const;

const TILE_CLASSES: Record<SystemAlert['severity'], string> = {
  critical: 'border-destructive/40 bg-destructive/10',
  warning: 'border-warning/40 bg-warning/10',
  info: 'border-info/40 bg-info/10',
  ok: 'border-success/40 bg-success/10',
};

const TITLE_CLASSES: Record<SystemAlert['severity'], string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
  ok: 'text-success',
};

function AlertsPage() {
  const navigate = Route.useNavigate();
  const { severity } = Route.useSearch();
  const query = useAlerts({ pageSize: 100, severity: severity ? [severity] : undefined });
  const acknowledge = useAcknowledgeAlert();
  const ackAll = useAcknowledgeAll();

  const alerts = query.data?.data ?? [];
  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: alerts.filter((a) => a.severity === sev),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        title="Alerts & Notifications"
        description="Operational alert center grouped by severity"
        actions={
          <Can permission="alerts.manage">
            <Button
              variant="outline"
              onClick={() => ackAll.mutate()}
              disabled={ackAll.isPending || alerts.every((a) => a.acknowledged)}
            >
              <CheckCheck className="size-4" /> Acknowledge all
            </Button>
          </Can>
        }
      />

      <Tabs
        value={severity ?? 'all'}
        onValueChange={(v) =>
          void navigate({ search: { severity: v === 'all' ? undefined : v }, replace: true })
        }
      >
        <TabsList className="rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
          {SEVERITY_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="rounded-lg capitalize">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="Everything looks calm. New alerts will appear here."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.severity}>
              <h2 className={cn('mb-3 text-sm font-bold uppercase tracking-wider', TITLE_CLASSES[group.severity])}>
                {group.severity} · {group.items.length}
              </h2>
              <ul className="space-y-2.5">
                {group.items.map((alert) => (
                  <li key={alert.id}>
                    <Card
                      className={cn(
                        'flex-row items-start gap-4 rounded-2xl border p-5',
                        TILE_CLASSES[alert.severity],
                        alert.acknowledged && 'opacity-55',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className={cn('font-semibold', TITLE_CLASSES[alert.severity])}>
                            {alert.title}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {statusLabel(alert.type)} · {formatTimeAgo(alert.at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                        {alert.relatedEntity && (
                          <Link
                            to={
                              alert.relatedEntity.kind === 'merchant'
                                ? '/merchants/$merchantId'
                                : '/terminals/$terminalId'
                            }
                            params={
                              (alert.relatedEntity.kind === 'merchant'
                                ? { merchantId: alert.relatedEntity.id }
                                : { terminalId: alert.relatedEntity.id }) as never
                            }
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
                          >
                            <ExternalLink className="size-3" />
                            Open {alert.relatedEntity.kind} {alert.relatedEntity.id}
                          </Link>
                        )}
                      </div>
                      <Can permission="alerts.manage">
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          disabled={acknowledge.isPending}
                          onClick={() =>
                            acknowledge.mutate({
                              id: alert.id,
                              acknowledged: !alert.acknowledged,
                            })
                          }
                        >
                          {alert.acknowledged ? (
                            <>
                              <RotateCcw className="size-4" /> Reopen
                            </>
                          ) : (
                            <>
                              <Check className="size-4" /> Acknowledge
                            </>
                          )}
                        </Button>
                      </Can>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
