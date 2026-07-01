import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import type { Permission } from '@/lib/permissions';

/**
 * Element-level RBAC gate. Renders children only when the current user's
 * role grants the permission; optionally renders a fallback instead.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useAuthStore((s) => s.can(permission));
  return <>{allowed ? children : fallback}</>;
}
