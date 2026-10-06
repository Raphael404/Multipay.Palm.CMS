import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';

/** Detail-page header: back link + title, or a skeleton while loading. */
export function DetailHeader({
  backTo,
  loading,
  title,
  description,
  actions,
}: {
  backTo: LinkProps['to'];
  loading: boolean;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild>
        <Link to={backTo} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Link>
      </Button>
      {loading ? (
        <Skeleton className="h-10 w-72" />
      ) : (
        <PageHeader title={title} description={description} actions={actions} />
      )}
    </div>
  );
}
