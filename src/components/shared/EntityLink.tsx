import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export type LinkedEntity = 'Terminal' | 'Merchant' | 'Device';

/** Link to a terminal / merchant / device detail page. Clicks don't trigger row clicks. */
export function EntityLink({
  type,
  id,
  children,
  className,
}: {
  type: LinkedEntity;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const props = {
    className: cn('text-info hover:underline', className),
    onClick: (e: MouseEvent) => e.stopPropagation(),
    children,
  };
  switch (type) {
    case 'Terminal':
      return <Link to="/terminals/$terminalId" params={{ terminalId: id }} {...props} />;
    case 'Merchant':
      return <Link to="/merchants/$merchantId" params={{ merchantId: id }} {...props} />;
    case 'Device':
      return <Link to="/devices/$deviceId" params={{ deviceId: id }} {...props} />;
  }
}
