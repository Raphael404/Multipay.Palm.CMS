/**
 * In-memory mock database, loaded from the static JSON files in ./data.
 * Mutations persist for the lifetime of the browser session, so the app
 * feels alive end-to-end. All timestamps are re-anchored from the
 * generation time to "now" on first load, so seeded data never goes stale.
 */
import type {
  AdminUser,
  ApiKey,
  AuditLogEntry,
  ExportRecord,
  Merchant,
  SystemAlert,
  SystemLogEntry,
  Terminal,
  Transaction,
} from '@/types';

import metaJson from './data/meta.json';
import merchantsJson from './data/merchants.json';
import terminalsJson from './data/terminals.json';
import transactionsJson from './data/transactions.json';
import usersJson from './data/users.json';
import auditLogsJson from './data/audit-logs.json';
import alertsJson from './data/alerts.json';
import systemLogsJson from './data/system-logs.json';
import apiKeysJson from './data/api-keys.json';
import exportRecordsJson from './data/export-records.json';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reanchor<T>(value: T, offsetMs: number): T {
  if (typeof value === 'string' && ISO_RE.test(value)) {
    return new Date(new Date(value).getTime() + offsetMs).toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => reanchor(v, offsetMs)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reanchor(v, offsetMs);
    return out as T;
  }
  return value;
}

const offset = Date.now() - new Date(metaJson.generatedAt).getTime();

export const db = {
  merchants: reanchor(merchantsJson, offset) as unknown as Merchant[],
  terminals: reanchor(terminalsJson, offset) as unknown as Terminal[],
  transactions: reanchor(transactionsJson, offset) as unknown as Transaction[],
  users: reanchor(usersJson, offset) as unknown as AdminUser[],
  auditLogs: reanchor(auditLogsJson, offset) as unknown as AuditLogEntry[],
  alerts: reanchor(alertsJson, offset) as unknown as SystemAlert[],
  systemLogs: reanchor(systemLogsJson, offset) as unknown as SystemLogEntry[],
  apiKeys: reanchor(apiKeysJson, offset) as unknown as ApiKey[],
  exportRecords: reanchor(exportRecordsJson, offset) as unknown as ExportRecord[],
};

let auditSeq = db.auditLogs.length + 1;

export function appendAudit(
  entry: Omit<AuditLogEntry, 'id' | 'at' | 'ip' | 'userId' | 'userName'> & {
    userId?: string;
    userName?: string;
  },
): void {
  let user: { id: string; name: string } | null = null;
  try {
    const raw = localStorage.getItem('palmpay.user');
    if (raw) user = JSON.parse(raw) as { id: string; name: string };
  } catch {
    user = null;
  }
  db.auditLogs.unshift({
    id: `AUD-${String(auditSeq++).padStart(4, '0')}`,
    at: new Date().toISOString(),
    userId: entry.userId ?? user?.id ?? 'U-000',
    userName: entry.userName ?? user?.name ?? 'Unknown',
    ip: '91.151.136.42',
    ...entry,
  });
}
