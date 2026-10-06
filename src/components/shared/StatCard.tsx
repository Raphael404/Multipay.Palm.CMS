import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  loading?: boolean;
  /** `sm` for secondary KPI rows. */
  size?: 'default' | 'sm';
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  icon,
  loading,
  size = 'default',
  className,
}: StatCardProps) {
  const sm = size === 'sm';
  return (
    <Card className={cn('rounded-2xl', sm ? 'gap-1 p-4' : 'gap-2 p-5', className)}>
      <div className="flex items-center justify-between">
        <p className={cn('font-medium text-muted-foreground', sm ? 'text-xs' : 'text-sm')}>
          {label}
        </p>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      {loading ? (
        <>
          <Skeleton className={sm ? 'h-7 w-20' : 'h-9 w-28'} />
          {!sm && <Skeleton className="h-4 w-20" />}
        </>
      ) : (
        <>
          <p
            className={cn(
              'font-bold tracking-tight text-foreground',
              sm ? 'text-xl' : 'text-3xl xl:text-4xl',
            )}
          >
            {value}
          </p>
          {delta != null && (
            <p
              className={cn(
                'text-sm font-medium',
                deltaTone === 'positive' && 'text-success',
                deltaTone === 'negative' && 'text-destructive',
                deltaTone === 'neutral' && 'text-muted-foreground',
              )}
            >
              {delta}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
