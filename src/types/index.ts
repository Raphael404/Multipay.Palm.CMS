export type MerchantStatus = 'active' | 'suspended' | 'pending_kyc' | 'closed';
export type TerminalStatus = 'online' | 'offline' | 'maintenance' | 'decommissioned';
export type TxStatus = 'success' | 'failed' | 'pending' | 'refunded';
export type TxFailureReason =
  | 'network_error'
  | 'timeout'
  | 'bank_decline'
  | 'terminal_offline'
  | 'auth_failed';
export type SettlementStatus = 'pending' | 'settled' | 'delayed' | 'on_hold';
export type PaymentMethod = 'palm_authentication' | 'card_fallback';
export type Role =
  | 'super_admin'
  | 'finance_admin'
  | 'operations_manager'
  | 'technical_support'
  | 'merchant_support'
  | 'viewer';

export interface MerchantDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  url: string;
}

export interface Merchant {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  status: MerchantStatus;
  contact: { person: string; phone: string; email: string; address: string };
  terminalIds: string[];
  turnover: { today: number; week: number; month: number };
  commissionRate: number; // %
  commissionHistory: { rate: number; changedAt: string; changedBy: string }[];
  documents: MerchantDocument[];
  createdAt: string;
}

export interface TerminalActivityEvent {
  at: string;
  event: string;
  detail?: string;
}

export interface Terminal {
  id: string; // e.g. "MP-228"
  serialNumber: string;
  status: TerminalStatus;
  merchantId: string | null;
  locationAddress: string;
  installedAt: string;
  lastSeenAt: string;
  firmwareVersion: string;
  uptimePercent30d: number;
  activityLog: TerminalActivityEvent[];
}

export interface Transaction {
  id: string; // e.g. "TX-948211"
  occurredAt: string;
  merchantId: string;
  terminalId: string;
  amount: number;
  currency: 'GEL';
  method: PaymentMethod;
  status: TxStatus;
  errorCode?: string;
  failureReason?: TxFailureReason;
  settlementStatus: SettlementStatus;
  settledAt?: string;
  commissionAmount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  twoFactorEnabled: boolean;
  lastLoginAt: string;
}

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'settings_change';

export interface AuditLogEntry {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes?: { field: string; from: string; to: string }[];
  ip: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'ok';
export type AlertType =
  | 'terminal_offline'
  | 'fail_rate_spike'
  | 'low_turnover'
  | 'maintenance'
  | 'settlement_delay'
  | 'failed_auth_spike'
  | 'aml_status';

export interface SystemAlert {
  id: string;
  at: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  description: string;
  acknowledged: boolean;
  relatedEntity?: { kind: 'merchant' | 'terminal'; id: string };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SystemLogEntry {
  id: string;
  at: string;
  level: LogLevel;
  service: string;
  message: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface ExportRecord {
  id: string;
  at: string;
  report: string;
  format: 'csv' | 'pdf' | 'xlsx';
  byUser: string;
  scope: string;
}

/** Standard list envelope returned by every collection endpoint. */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}
