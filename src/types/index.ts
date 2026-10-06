/** Domain types mirroring the Admin API OpenAPI schemas. Enums are sent as strings. */

export type { Paginated } from '@/lib/api-client';

// Enum values come from the API as strings. Each list is the single source for
// its type and for every filter/select that offers it.
export const ROLES = ['SuperAdmin', 'Admin', 'Operator'] as const;
export type Role = (typeof ROLES)[number];

export const MERCHANT_STATUSES = ['Active', 'Deactivated', 'Cancelled'] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const TERMINAL_STATUSES = [
  'Active',
  'Inactive',
  'Deactivated',
  'Suspended',
  'Registered',
  'Provisioned',
] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export type TerminalType = 'POS' | 'PalmScanner' | 'Kiosk';
export type DeviceType = 'Standalone' | 'Integrated';

export type DeviceStatus = 'InStock' | 'Assigned' | 'InRepair' | 'Retired';

export const PAYMENT_STATUSES = [
  'Pending',
  'Matched',
  'Failed',
  'Cancelled',
  'Completed',
  'Authorized',
  'RefundedByCustomer',
  'RefundedBySystem',
  'RefundInitiated',
  'Refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentFailureCategory =
  | 'NetworkError'
  | 'AuthenticationError'
  | 'InsufficientFunds'
  | 'CardDeclined'
  | 'Timeout'
  | 'SystemError'
  | 'ValidationError'
  | 'DuplicateTransaction'
  | 'Unknown';

export type ReportType = 'Turnover' | 'Settlement' | 'Failed';

/** ISO 4217 code, e.g. "GEL". */
export type CurrencyCode = string;

// ── Auth ────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  email: string;
  role: Role;
}

export interface SessionUser {
  email: string;
  role: Role;
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export interface Kpis {
  activeTerminals: number;
  todayVolume: number;
  successRate: number;
  registeredUsers: number;
  turnover30d: number;
  failedOperations30d: number;
  activeMerchants: number;
  averageTransaction: number;
  terminalsOnline: number;
  terminalsOffline: number;
}

export interface HourlyDataPoint {
  hour: string | null;
  volume: number;
  transactionCount: number;
}

export interface RatioItem {
  label: string | null;
  count: number;
  percentage: number;
}

export interface SuccessRatio {
  totalCount: number;
  items: RatioItem[];
}

export interface TopMerchant {
  merchantId: string;
  merchantName: string | null;
  activeTerminals: number;
  status: MerchantStatus;
  todayRevenue: number;
}

export interface RecentTransaction {
  id: string;
  timestamp: string;
  merchantName: string | null;
  terminalSerialNumber: string | null;
  amount: number;
  currencyCode: CurrencyCode;
  status: PaymentStatus;
}

// ── Merchants ───────────────────────────────────────────────────────────────
export interface MerchantListItem {
  id: string;
  merchantExternalId: string | null;
  merchantName: string | null;
  customerName: string | null;
  taxCode: string | null;
  brandName: string | null;
  region: string | null;
  district: string | null;
  address: string | null;
  status: MerchantStatus;
  terminalsCount: number;
  registrationDate: string;
}

export interface MerchantDetail {
  id: string;
  merchantExternalId: string | null;
  merchantName: string | null;
  customerName: string | null;
  taxCode: string | null;
  brandName: string | null;
  region: string | null;
  district: string | null;
  address: string | null;
  profile: string | null;
  merchantCategory: string | null;
  contactPhone: string | null;
  contactPersonName: string | null;
  status: MerchantStatus;
  terminalCount: number;
  totalVolume: number;
  createdAt: string;
  updatedAt: string | null;
}

export type UpdateMerchantInput = Omit<
  MerchantDetail,
  'terminalCount' | 'totalVolume' | 'createdAt' | 'updatedAt'
>;

export interface MerchantTerminalItem {
  terminalId: string;
  referenceId: string | null;
  status: TerminalStatus;
  terminalType: TerminalType;
  palmModuleSerialNumber: string | null;
  createdAt: string;
}

export interface DailyTurnoverItem {
  date: string;
  volume: number;
  count: number;
}

export interface MerchantTurnover {
  totalVolume: number;
  transactionCount: number;
  averageTransaction: number;
  dailyBreakdown: DailyTurnoverItem[];
}

export interface MerchantTransactionItem {
  paymentId: string;
  amount: number;
  currencyCode: CurrencyCode;
  status: PaymentStatus;
  terminalReferenceId: string | null;
  createdAt: string;
}

// ── Terminals ───────────────────────────────────────────────────────────────
export interface CurrentDevice {
  assignmentId: string;
  deviceId: string;
  palmModuleSerialNumber: string | null;
  posUnitSerialNumber: string | null;
  type: DeviceType;
  assignedAt: string;
}

export interface Terminal {
  id: string;
  referenceId: string | null;
  status: TerminalStatus;
  terminalType: TerminalType;
  merchantId: string | null;
  merchantExternalId: string | null;
  merchantName: string | null;
  contactPersonName: string | null;
  contactPhone: string | null;
  registeredAt: string;
  updatedAt: string | null;
  currentDevice: CurrentDevice | null;
}

export interface DeviceAssignment {
  id: string;
  terminalId: string;
  terminalReferenceId: string | null;
  merchantName: string | null;
  deviceId: string;
  palmModuleSerialNumber: string | null;
  posUnitSerialNumber: string | null;
  assignedAt: string;
  unassignedAt: string | null;
  assignReason: string | null;
  unassignReason: string | null;
  isOpen: boolean;
}

export interface TerminalDetail {
  terminal: Terminal;
  assignmentHistory: DeviceAssignment[];
}

export interface Device {
  id: string;
  palmModuleSerialNumber: string | null;
  posUnitSerialNumber: string | null;
  type: DeviceType;
  status: DeviceStatus;
  model: string | null;
  notes: string | null;
  registeredAt: string;
  updatedAt: string | null;
}

// ── Transactions ────────────────────────────────────────────────────────────
export interface TransactionListItem {
  id: string;
  amount: number;
  currencyCode: CurrencyCode;
  status: PaymentStatus;
  merchantName: string | null;
  terminalReferenceId: string | null;
  isIntegrated: boolean;
  createdAt: string;
}

export interface TransactionDetail {
  id: string;
  terminalId: string;
  palmId: string | null;
  idempotencyKey: string | null;
  amount: number;
  currencyCode: CurrencyCode;
  status: PaymentStatus;
  lastReceivedEventType: string;
  additionalInfo: string | null;
  expiresAt: string;
  isIntegrated: boolean;
  batchNumber: number | null;
  merchantName: string | null;
  merchantId: string | null;
  terminalReferenceId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ── Failed monitoring ───────────────────────────────────────────────────────
export interface FailedMetrics {
  totalFailed: number;
  failureRate: number;
  mostCommonReason: string | null;
  totalAffectedAmount: number;
  averageFailedAmount: number;
  comparedToPreviousPeriod: number;
}

export interface FailedByReasonItem {
  category: PaymentFailureCategory;
  label: string | null;
  count: number;
  percentage: number;
}

export interface FailedTimelineItem {
  date: string;
  failedCount: number;
  totalCount: number;
  failRate: number;
}

export interface FailedTransactionItem {
  paymentId: string;
  amount: number;
  currencyCode: CurrencyCode;
  merchantName: string | null;
  terminalReferenceId: string | null;
  failedAt: string;
  errorCode: string | null;
  category: PaymentFailureCategory;
}

// ── Analytics ───────────────────────────────────────────────────────────────
export interface AnalyticsOverview {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: number;
  averageTicket: number;
  successRate: number;
  failRate: number;
  comparedToPrevious: { volumeChange: number; countChange: number } | null;
}

export interface MerchantAnalyticsItem {
  merchantId: string;
  merchantName: string | null;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  totalVolume: number;
  averageTicket: number;
  successRate: number;
}

export interface TerminalAnalyticsItem {
  terminalId: string;
  referenceId: string | null;
  merchantName: string | null;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  totalVolume: number;
  averageTicket: number;
  successRate: number;
}

export interface TimeSeriesDataPoint {
  label: string | null;
  transactionCount: number;
  successfulCount: number;
  failedCount: number;
  volume: number;
  successRate: number;
}

// ── Reports ─────────────────────────────────────────────────────────────────
export interface ReportRequest {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  merchantId?: string;
}

export interface ReportPreviewRow {
  occurredAt: string;
  merchantName: string | null;
  terminalReference: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  reference: string | null;
}

export interface ReportPreview {
  reportType: ReportType;
  dateFrom: string;
  dateTo: string;
  rowCount: number;
  totalAmount: number;
  rows: ReportPreviewRow[];
}

export interface ExportedReport {
  id: string;
  reportType: ReportType;
  fileName: string | null;
  rowCount: number;
  createdAt: string;
}

export interface RecentReport extends ExportedReport {
  dateFrom: string;
  dateTo: string;
  merchantId: string | null;
}

// ── Users ───────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface InviteUserInput {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
}
