import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'grid' | 'inline';
const VariantContext = createContext<Variant>('grid');

/**
 * Label/value list. `grid` lays labels and values out in two columns (cards);
 * `inline` pushes each value to the right edge (narrow sheets).
 */
export function DetailList({
  variant = 'grid',
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <VariantContext.Provider value={variant}>
      <dl className={cn('text-sm', variant === 'grid' ? 'grid grid-cols-2 gap-y-3' : 'space-y-2')}>
        {children}
      </dl>
    </VariantContext.Provider>
  );
}

/** One row of a DetailList; empty values render as "—". */
export function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  const variant = useContext(VariantContext);
  const value = children === null || children === undefined || children === '' ? '—' : children;
  return (
    <div className={variant === 'grid' ? 'contents' : 'flex items-center justify-between gap-4'}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 font-medium text-foreground', variant === 'inline' && 'text-right')}>
        {value}
      </dd>
    </div>
  );
}
