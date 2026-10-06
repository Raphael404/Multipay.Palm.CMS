import type { Role } from '@/types';

export type Permission =
  | 'merchants.write'
  | 'terminals.write'
  | 'users.read'
  | 'users.write';

/**
 * UI gating only; the backend enforces the real rules.
 * Users: list → SuperAdmin + Admin; invite/role/status → SuperAdmin.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SuperAdmin: new Set(['merchants.write', 'terminals.write', 'users.read', 'users.write']),
  Admin: new Set(['merchants.write', 'terminals.write', 'users.read']),
  Operator: new Set(['merchants.write', 'terminals.write']),
};

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Operator: 'Operator',
};
