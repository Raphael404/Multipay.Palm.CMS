import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pause, Play, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { api } from '@/lib/api-client';
import type { Paginated, SystemLogEntry } from '@/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_app/system-logs')({
  component: SystemLogsPage,
});

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

const LEVEL_CLASSES: Record<string, string> = {
  debug: 'text-muted-foreground',
  info: 'text-info',
  warn: 'text-warning',
  error: 'text-destructive',
};

function SystemLogsPage() {
  const [level, setLevel] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [liveTail, setLiveTail] = useState(true);

  const query = useQuery({
    queryKey: ['system-logs', { level, search }],
    queryFn: () =>
      api.get<Paginated<SystemLogEntry>>('/system-logs', {
        pageSize: 100,
        level: level ? [level] : undefined,
        search: search || undefined,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: liveTail ? 5_000 : false,
  });

  const rows = query.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="System Logs"
        description="Technical log stream from platform services"
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            {liveTail ? (
              <Play className="size-4 text-success" />
            ) : (
              <Pause className="size-4 text-muted-foreground" />
            )}
            <Label htmlFor="live-tail" className="text-sm">
              Live tail
            </Label>
            <Switch id="live-tail" checked={liveTail} onCheckedChange={setLiveTail} />
          </div>
        }
      />

      <Card className="rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter messages..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={level ?? 'all'} onValueChange={(v) => setLevel(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {liveTail && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              polling every 5s
            </span>
          )}
        </div>

        {query.isPending ? (
          <div className="space-y-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No log entries" description="Try a different level or search." />
        ) : (
          <div className="max-h-[640px] overflow-y-auto rounded-xl border border-border bg-[#070d18] p-4 font-mono text-[13px] leading-6">
            {rows.map((log) => (
              <div key={log.id} className="flex gap-3 whitespace-nowrap hover:bg-card/60">
                <span className="text-muted-foreground/60">
                  {format(parseISO(log.at), 'MMM dd HH:mm:ss')}
                </span>
                <span className={cn('w-12 shrink-0 font-semibold uppercase', LEVEL_CLASSES[log.level])}>
                  {log.level}
                </span>
                <span className="w-32 shrink-0 text-violet-400">{log.service}</span>
                <span className="text-foreground/90">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
