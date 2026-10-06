import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const TONE_BY_STATUS: Record<string, Tone> = {
  // merchants / terminals
  Active: 'success',
  Inactive: 'muted',
  Deactivated: 'muted',
  Cancelled: 'destructive',
  Suspended: 'warning',
  Registered: 'info',
  Provisioned: 'info',
  // payments
  Completed: 'success',
  Authorized: 'success',
  Matched: 'info',
  Pending: 'warning',
  Failed: 'destructive',
  RefundedByCustomer: 'info',
  RefundedBySystem: 'info',
  RefundInitiated: 'info',
  Refunded: 'info',
  // devices
  InStock: 'info',
  Assigned: 'success',
  InRepair: 'warning',
  Retired: 'muted',
  // users
  Disabled: 'muted',
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

/**
 * "RefundedByCustomer" → "Refunded By Customer". Tolerates values outside the
 * documented enum (the API has returned raw numbers and null for some fields).
 */
export function statusLabel(status: unknown): string {
  if (status === null || status === undefined || status === '') return '—';
  if (typeof status !== 'string') return `Unknown (${String(status)})`;
  return status
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusText({
  status,
  withDot = false,
  className,
}: {
  status: unknown;
  withDot?: boolean;
  className?: string;
}) {
  const tone = (typeof status === 'string' && TONE_BY_STATUS[status]) || 'muted';
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm font-medium', TONE_CLASSES[tone], className)}
    >
      {withDot && <span className={cn('size-1.5 rounded-full', DOT_CLASSES[tone])} />}
      {statusLabel(status)}
    </span>
  );
}
