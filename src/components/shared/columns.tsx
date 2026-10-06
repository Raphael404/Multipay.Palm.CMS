import type { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatDateTime, formatMoney, formatNumber, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusText, statusLabel } from '@/components/shared/StatusText';

/**
 * Column factories for the recurring cell types, so tables only declare
 * which field goes where. Every cell renders "—" for empty values.
 */

type Key<T> = keyof T & string;
type Col<T> = ColumnDef<T>;

const EMPTY = '—';

function value<T>(row: T, key: Key<T>): unknown {
  return row[key];
}

export const col = {
  /** Plain text. `strong` for the row's main identifier, `muted` for secondary info. */
  text<T>(key: Key<T>, header: string, opts: { strong?: boolean; muted?: boolean } = {}): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => (
        <span
          className={cn(
            opts.strong && 'font-medium text-foreground',
            opts.muted && 'text-muted-foreground',
          )}
        >
          {(value(row.original, key) as string | null) || EMPTY}
        </span>
      ),
    };
  },

  /** Monospace id / code. */
  mono<T>(key: Key<T>, header: string): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {(value(row.original, key) as string | null) || EMPTY}
        </span>
      ),
    };
  },

  date<T>(key: Key<T>, header: string, opts: { time?: boolean } = { time: true }): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => {
        const iso = value(row.original, key) as string | null;
        if (!iso) return EMPTY;
        return (
          <span className="text-muted-foreground">
            {opts.time ? formatDateTime(iso) : formatDate(iso)}
          </span>
        );
      },
    };
  },

  /** Amount in the row's own currency (`currencyKey`), GEL otherwise. */
  money<T>(key: Key<T>, header: string, currencyKey?: Key<T>): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {formatMoney(
            value(row.original, key) as number,
            currencyKey ? (value(row.original, currencyKey) as string) : undefined,
          )}
        </span>
      ),
    };
  },

  number<T>(key: Key<T>, header: string, opts: { tone?: 'destructive' } = {}): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => (
        <span className={cn(opts.tone === 'destructive' && 'text-destructive')}>
          {formatNumber(value(row.original, key) as number)}
        </span>
      ),
    };
  },

  percent<T>(key: Key<T>, header: string): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => formatPercent(value(row.original, key) as number),
    };
  },

  /** Coloured status with a dot. */
  status<T>(key: Key<T>, header = 'Status'): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => <StatusText status={value(row.original, key)} withDot />,
    };
  },

  /** Enum shown as words ("PalmScanner" → "Palm Scanner") without status colour. */
  label<T>(key: Key<T>, header: string, opts: { tone?: 'destructive' } = {}): Col<T> {
    return {
      accessorKey: key,
      header,
      cell: ({ row }) => (
        <span className={cn(opts.tone === 'destructive' && 'text-destructive')}>
          {statusLabel(value(row.original, key))}
        </span>
      ),
    };
  },
};
