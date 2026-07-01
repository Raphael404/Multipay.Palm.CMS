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
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  icon,
  loading,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('gap-2 rounded-2xl p-5', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-20" />
        </>
      ) : (
        <>
          <p className="text-3xl font-bold tracking-tight text-foreground xl:text-4xl">{value}</p>
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
