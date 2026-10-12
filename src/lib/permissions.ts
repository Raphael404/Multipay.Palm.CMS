import type { Role } from '@/types';

export type Permission =
  | 'merchants.write'
  | 'terminals.write'
  | 'devices.write'
  | 'users.read'
  | 'users.write'
  | 'audit.read';

/**
 * UI gating only; the backend enforces the real rules.
 * Users: list → SuperAdmin + Admin; invite/role/status → SuperAdmin.
 * Audit log: SuperAdmin + Admin.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SuperAdmin: new Set([
    'merchants.write',
    'terminals.write',
    'devices.write',
    'users.read',
    'users.write',
    'audit.read',
  ]),
  Admin: new Set([
    'merchants.write',
    'terminals.write',
    'devices.write',
    'users.read',
    'audit.read',
  ]),
  Operator: new Set(['merchants.write', 'terminals.write', 'devices.write']),
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
