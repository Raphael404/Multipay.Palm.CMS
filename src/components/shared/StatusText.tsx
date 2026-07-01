import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const TONE_BY_STATUS: Record<string, Tone> = {
  // terminals
  online: 'success',
  offline: 'destructive',
  maintenance: 'warning',
  decommissioned: 'muted',
  // merchants
  active: 'success',
  suspended: 'destructive',
  pending_kyc: 'warning',
  closed: 'muted',
  // transactions
  success: 'success',
  failed: 'destructive',
  pending: 'warning',
  refunded: 'info',
  // settlement
  settled: 'success',
  delayed: 'warning',
  on_hold: 'destructive',
  // users
  disabled: 'muted',
  // alerts
  critical: 'destructive',
  warning: 'warning',
  info: 'info',
  ok: 'success',
  // logs
  error: 'destructive',
  warn: 'warning',
  debug: 'muted',
};

const TONE_CLASSES: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
  muted: 'text-muted-foreground',
};

const DOT_CLASSES: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  muted: 'bg-muted-foreground',
};

export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function StatusText({
  status,
  withDot = false,
  className,
}: {
  status: string;
  withDot?: boolean;
  className?: string;
}) {
  const tone = TONE_BY_STATUS[status] ?? 'muted';
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', TONE_CLASSES[tone], className)}
    >
      {withDot && <span className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} />}
      {statusLabel(status)}
    </span>
  );
}
