import type { ComponentProps, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Button that swaps its icon for a spinner and disables itself while pending. */
export function LoadingButton({
  pending,
  icon,
  disabled,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean; icon?: ReactNode }) {
  return (
    <Button disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}
