import type { Role } from '@/types';

export type Permission =
  | 'merchants.read'
  | 'merchants.write'
  | 'terminals.read'
  | 'terminals.write'
  | 'transactions.read'
  | 'transactions.write'
  | 'commissions.read'
  | 'commissions.write'
  | 'analytics.read'
  | 'reports.read'
  | 'reports.export'
  | 'alerts.read'
  | 'alerts.manage'
  | 'audit.read'
  | 'system_logs.read'
  | 'users.read'
  | 'users.write'
  | 'settings.read'
  | 'settings.write'
  | 'api_keys.manage';

const VIEWER: Permission[] = [
  'merchants.read',
  'terminals.read',
  'transactions.read',
  'commissions.read',
  'analytics.read',
  'reports.read',
  'alerts.read',
  'audit.read',
  'system_logs.read',
  'settings.read',
];

const MERCHANT_SUPPORT: Permission[] = [
  ...VIEWER,
  'merchants.write',
];

const TECHNICAL_SUPPORT: Permission[] = [
  ...VIEWER,
  'terminals.write',
];

const OPERATIONS_MANAGER: Permission[] = [
  ...VIEWER,
  'merchants.write',
  'terminals.write',
  'transactions.write',
  'alerts.manage',
];

const FINANCE_ADMIN: Permission[] = [
  ...OPERATIONS_MANAGER,
  'commissions.write',
  'reports.export',
];

const SUPER_ADMIN: Permission[] = [
  ...FINANCE_ADMIN,
  'users.read',
  'users.write',
  'settings.write',
  'api_keys.manage',
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set(VIEWER),
  merchant_support: new Set(MERCHANT_SUPPORT),
  technical_support: new Set(TECHNICAL_SUPPORT),
  operations_manager: new Set(OPERATIONS_MANAGER),
  finance_admin: new Set(FINANCE_ADMIN),
  super_admin: new Set(SUPER_ADMIN),
};

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  finance_admin: 'Finance Admin',
  operations_manager: 'Operations Manager',
  technical_support: 'Technical Support',
  merchant_support: 'Merchant Support',
  viewer: 'Viewer',
};
