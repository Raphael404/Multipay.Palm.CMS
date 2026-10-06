import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionCard } from '@/components/shared/SectionCard';
import { ErrorState } from '@/components/shared/ErrorState';

/** Section card for a chart, with loading, error and empty states. */
export function ChartCard({
  title,
  description,
  actions,
  className,
  height = 260,
  loading,
  error,
  onRetry,
  empty,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  height?: number;
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description} actions={actions} className={className}>
      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : loading ? (
        <Skeleton className="w-full" style={{ height }} />
      ) : empty ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
          style={{ height }}
        >
          <BarChart3 className="size-5" />
          No data for this period
        </div>
      ) : (
        children
      )}
    </SectionCard>
  );
}
