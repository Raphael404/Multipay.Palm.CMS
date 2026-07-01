import { Fragment, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { AdminUser, AuditLogEntry, Paginated } from '@/types';
import { formatDateTime } from '@/lib/format';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { statusLabel } from '@/components/shared/StatusText';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/audit-logs')({
  component: AuditLogsPage,
});

const ACTIONS = ['login', 'logout', 'create', 'update', 'delete', 'export', 'settings_change'];

const ACTION_TONES: Record<string, string> = {
  login: 'text-success',
  logout: 'text-muted-foreground',
  create: 'text-info',
  update: 'text-warning',
  delete: 'text-destructive',
  export: 'text-violet-400',
  settings_change: 'text-warning',
};

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<string | null>(null);

  const users = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => api.get<Paginated<AdminUser>>('/users', { pageSize: 50 }),
  });

  const query = useQuery({
    queryKey: ['audit-logs', { page, action, userId }],
    queryFn: () =>
      api.get<Paginated<AuditLogEntry>>('/audit-logs', {
        page,
        pageSize: 15,
        action: action ? [action] : undefined,
        userId,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 15));

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Who changed what — every administrative action with field-level diffs"
      />

      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select
            value={userId ?? 'all'}
            onValueChange={(v) => {
              setUserId(v === 'all' ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {(users.data?.data ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={action ?? 'all'}
            onValueChange={(v) => {
              setAction(v === 'all' ? undefined : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>
                  {statusLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No audit entries" description="Try different filters." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-card-elevated/50 hover:bg-card-elevated/50">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => {
                  const hasChanges = (log.changes?.length ?? 0) > 0;
                  const isOpen = expanded === log.id;
                  return (
                    <Fragment key={log.id}>
                      <TableRow
                        className={cn('border-border', hasChanges && 'cursor-pointer')}
                        onClick={() => hasChanges && setExpanded(isOpen ? null : log.id)}
                      >
                        <TableCell className="py-3">
                          {hasChanges &&
                            (isOpen ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            ))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-3 text-muted-foreground">
                          {formatDateTime(log.at)}
                        </TableCell>
                        <TableCell className="py-3 font-medium text-foreground">
                          {log.userName}
                        </TableCell>
                        <TableCell className={cn('py-3 font-medium', ACTION_TONES[log.action])}>
                          {statusLabel(log.action)}
                        </TableCell>
                        <TableCell className="py-3 text-muted-foreground">
                          {log.entity}
                          {log.entityId && (
                            <span className="ml-1.5 font-mono text-xs text-foreground">
                              {log.entityId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                          {log.ip}
                        </TableCell>
                      </TableRow>
                      {isOpen && hasChanges && (
                        <TableRow className="border-border bg-card-elevated/30 hover:bg-card-elevated/30">
                          <TableCell />
                          <TableCell colSpan={5} className="py-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Field changes
                            </p>
                            <ul className="space-y-1.5">
                              {log.changes?.map((change, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  <span className="font-mono text-xs text-info">{change.field}</span>
                                  <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-xs text-destructive line-through">
                                    {change.from}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-xs text-success">
                                    {change.to}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {total > 15 && (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Page {page} of {pageCount} · {total.toLocaleString()} entries
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
