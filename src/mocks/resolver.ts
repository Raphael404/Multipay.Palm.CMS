/**
 * Mock REST resolver. Mirrors the future backend's API surface exactly:
 * every path/param the UI uses here must exist on the real backend.
 * Delete this folder (and set VITE_USE_MOCK=false) once the backend ships.
 */
import { ApiError, type QueryParams } from '@/lib/api-client';
import type {
  AdminUser,
  Merchant,
  Paginated,
  SystemAlert,
  Terminal,
  Transaction,
  TxFailureReason,
} from '@/types';
import { db, appendAudit } from './db';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface Ctx {
  params: Record<string, string>; // path params
  query: URLSearchParams;
  body: unknown;
}

type Handler = (ctx: Ctx) => unknown;

const delay = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 230));

// ------------------------------------------------------------------ helpers

function paginate<T>(rows: T[], query: URLSearchParams): Paginated<T> {
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 10)));
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: rows.length },
  };
}

function sortRows<T>(rows: T[], query: URLSearchParams, defaultSort?: string): T[] {
  const sort = query.get('sort') ?? defaultSort;
  if (!sort) return rows;
  const order = query.get('order') === 'asc' ? 1 : -1;
  const get = (obj: unknown, dotted: string): unknown =>
    dotted.split('.').reduce<unknown>((acc, k) => {
      if (acc !== null && typeof acc === 'object') return (acc as Record<string, unknown>)[k];
      return undefined;
    }, obj);
  return [...rows].sort((a, b) => {
    const av = get(a, sort);
    const bv = get(b, sort);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * order;
    return String(av).localeCompare(String(bv)) * order;
  });
}

function withinRange(iso: string, query: URLSearchParams): boolean {
  const from = query.get('from');
  const to = query.get('to');
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

const merchantName = (id: string | null) =>
  db.merchants.find((m) => m.id === id)?.name ?? '—';

const dayKey = (iso: string) => iso.slice(0, 10);

function rangeOrDefault(query: URLSearchParams, defaultDays: number): { from: string; to: string } {
  const to = query.get('to') ?? new Date().toISOString();
  const from =
    query.get('from') ??
    new Date(Date.now() - defaultDays * 86_400_000).toISOString();
  return { from, to };
}

function txInRange(from: string, to: string): Transaction[] {
  return db.transactions.filter((t) => t.occurredAt >= from && t.occurredAt <= to);
}

// --------------------------------------------------------------------- auth

const authHandlers: [Method, RegExp, Handler][] = [
  [
    'POST',
    /^\/auth\/login$/,
    ({ body }) => {
      const { email, password } = body as { email: string; password: string };
      const user = db.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'active',
      );
      if (!user || password !== 'palmpay123') {
        throw new ApiError(401, 'Invalid email or password');
      }
      return { requiresOtp: true, otpHint: 'Use 000000' };
    },
  ],
  [
    'POST',
    /^\/auth\/verify-otp$/,
    ({ body }) => {
      const { email, code } = body as { email: string; code: string };
      const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) throw new ApiError(401, 'Unknown user');
      if (code !== '000000') throw new ApiError(401, 'Invalid verification code');
      user.lastLoginAt = new Date().toISOString();
      appendAudit({
        action: 'login',
        entity: 'session',
        userId: user.id,
        userName: user.name,
      });
      return { token: `mock-token-${user.id}-${Date.now()}`, user };
    },
  ],
  [
    'POST',
    /^\/auth\/logout$/,
    () => {
      appendAudit({ action: 'logout', entity: 'session' });
      return { ok: true };
    },
  ],
];

// ---------------------------------------------------------------- dashboard

const HOUR = 3_600_000;

const dashboardHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/dashboard\/summary$/,
    () => {
      const now = Date.now();
      const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const last24h = db.transactions.filter(
        (t) => new Date(t.occurredAt).getTime() >= now - 24 * HOUR,
      );
      const today = db.transactions.filter(
        (t) => new Date(t.occurredAt).getTime() >= dayStart,
      );
      const yesterday = db.transactions.filter((t) => {
        const ts = new Date(t.occurredAt).getTime();
        return ts >= dayStart - 24 * HOUR && ts < dayStart;
      });
      const todayVolume = today
        .filter((t) => t.status === 'success')
        .reduce((s, t) => s + t.amount, 0);
      const yesterdayVolume = yesterday
        .filter((t) => t.status === 'success')
        .reduce((s, t) => s + t.amount, 0);
      const settled24 = last24h.filter((t) => t.status !== 'pending');
      const successRate24h = settled24.length
        ? (settled24.filter((t) => t.status === 'success' || t.status === 'refunded').length /
            settled24.length) *
          100
        : 100;
      const activeTerminals = db.terminals.filter((t) => t.status === 'online').length;
      const offlineTerminals = db.terminals.filter((t) => t.status === 'offline').length;
      const maintenanceTerminals = db.terminals.filter((t) => t.status === 'maintenance').length;
      const month = db.transactions.filter(
        (t) => new Date(t.occurredAt).getTime() >= now - 30 * 86_400_000,
      );
      const monthSuccess = month.filter((t) => t.status === 'success');
      const totalTurnover30d = monthSuccess.reduce((s, t) => s + t.amount, 0);
      return {
        activeTerminals,
        terminalsDeltaWeek: 18,
        todayVolume,
        todayVolumeDeltaPct: yesterdayVolume
          ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100
          : 0,
        successRate24h,
        registeredUsers: 14872,
        registeredUsersToday: 64,
        totalTurnover30d,
        failedCount30d: month.filter((t) => t.status === 'failed').length,
        activeMerchants: db.merchants.filter((m) => m.status === 'active').length,
        avgTransaction30d: monthSuccess.length ? totalTurnover30d / monthSuccess.length : 0,
        onlineOfflineSplit: {
          online: activeTerminals,
          offline: offlineTerminals,
          maintenance: maintenanceTerminals,
        },
      };
    },
  ],
  [
    'GET',
    /^\/dashboard\/hourly-volume$/,
    () => {
      const dayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const buckets = Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, '0')}:00`,
        volume: 0,
        count: 0,
      }));
      for (const t of db.transactions) {
        const ts = new Date(t.occurredAt).getTime();
        if (ts < dayStart || t.status !== 'success') continue;
        const h = new Date(t.occurredAt).getHours();
        buckets[h].volume += t.amount;
        buckets[h].count += 1;
      }
      const currentHour = new Date().getHours();
      return buckets.slice(0, currentHour + 1);
    },
  ],
  [
    'GET',
    /^\/dashboard\/status-ratio$/,
    () => {
      const now = Date.now();
      const last24h = db.transactions.filter(
        (t) => new Date(t.occurredAt).getTime() >= now - 24 * HOUR,
      );
      const count = (s: Transaction['status']) => last24h.filter((t) => t.status === s).length;
      return [
        { status: 'success', count: count('success') },
        { status: 'failed', count: count('failed') },
        { status: 'pending', count: count('pending') },
        { status: 'refunded', count: count('refunded') },
      ];
    },
  ],
  [
    'GET',
    /^\/dashboard\/top-merchants$/,
    () => {
      return db.merchants
        .filter((m) => m.status === 'active')
        .sort((a, b) => b.turnover.today - a.turnover.today)
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          activeTerminals: m.terminalIds.filter(
            (id) => db.terminals.find((t) => t.id === id)?.status === 'online',
          ).length,
          todayTurnover: m.turnover.today,
        }));
    },
  ],
];

// ---------------------------------------------------------------- merchants

let merchantSeq = db.merchants.length + 1;

const merchantHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/merchants$/,
    ({ query }) => {
      let rows = db.merchants;
      const search = query.get('search')?.toLowerCase();
      if (search) {
        rows = rows.filter(
          (m) =>
            m.name.toLowerCase().includes(search) ||
            m.legalName.toLowerCase().includes(search) ||
            m.taxId.includes(search) ||
            m.contact.person.toLowerCase().includes(search),
        );
      }
      const status = query.getAll('status');
      if (status.length) rows = rows.filter((m) => status.includes(m.status));
      rows = sortRows(rows, query, 'createdAt');
      return paginate(rows, query);
    },
  ],
  [
    'GET',
    /^\/merchants\/(?<id>[^/]+)$/,
    ({ params }) => {
      const m = db.merchants.find((x) => x.id === params.id);
      if (!m) throw new ApiError(404, 'Merchant not found');
      return m;
    },
  ],
  [
    'POST',
    /^\/merchants$/,
    ({ body }) => {
      const input = body as Partial<Merchant>;
      const merchant: Merchant = {
        id: `M-${String(merchantSeq++).padStart(3, '0')}`,
        name: input.name ?? 'New merchant',
        legalName: input.legalName ?? '',
        taxId: input.taxId ?? '',
        status: input.status ?? 'pending_kyc',
        contact: input.contact ?? { person: '', phone: '', email: '', address: '' },
        terminalIds: [],
        turnover: { today: 0, week: 0, month: 0 },
        commissionRate: input.commissionRate ?? 2.0,
        commissionHistory: [
          {
            rate: input.commissionRate ?? 2.0,
            changedAt: new Date().toISOString(),
            changedBy: 'You',
          },
        ],
        documents: [],
        createdAt: new Date().toISOString(),
      };
      db.merchants.unshift(merchant);
      appendAudit({ action: 'create', entity: 'merchant', entityId: merchant.id });
      return merchant;
    },
  ],
  [
    'PATCH',
    /^\/merchants\/(?<id>[^/]+)$/,
    ({ params, body }) => {
      const m = db.merchants.find((x) => x.id === params.id);
      if (!m) throw new ApiError(404, 'Merchant not found');
      const input = body as Partial<Merchant>;
      const changes: { field: string; from: string; to: string }[] = [];
      if (input.status && input.status !== m.status) {
        changes.push({ field: 'status', from: m.status, to: input.status });
      }
      if (input.commissionRate !== undefined && input.commissionRate !== m.commissionRate) {
        changes.push({
          field: 'commissionRate',
          from: String(m.commissionRate),
          to: String(input.commissionRate),
        });
        m.commissionHistory.push({
          rate: input.commissionRate,
          changedAt: new Date().toISOString(),
          changedBy: 'You',
        });
      }
      Object.assign(m, {
        ...input,
        contact: { ...m.contact, ...(input.contact ?? {}) },
        id: m.id,
        terminalIds: m.terminalIds,
        turnover: m.turnover,
        commissionHistory: m.commissionHistory,
        documents: m.documents,
      });
      appendAudit({
        action: 'update',
        entity: 'merchant',
        entityId: m.id,
        changes: changes.length ? changes : undefined,
      });
      return m;
    },
  ],
  [
    'POST',
    /^\/merchants\/(?<id>[^/]+)\/documents$/,
    ({ params, body }) => {
      const m = db.merchants.find((x) => x.id === params.id);
      if (!m) throw new ApiError(404, 'Merchant not found');
      const input = body as { name: string; type: string };
      const doc = {
        id: `DOC-${m.id}-${m.documents.length + 1}`,
        name: input.name,
        type: input.type,
        uploadedAt: new Date().toISOString(),
        url: '#',
      };
      m.documents.unshift(doc);
      appendAudit({ action: 'create', entity: 'document', entityId: doc.id });
      return doc;
    },
  ],
  [
    'GET',
    /^\/merchants\/(?<id>[^/]+)\/turnover$/,
    ({ params, query }) => {
      const granularity = query.get('granularity') ?? 'daily';
      const days = granularity === 'monthly' ? 30 : granularity === 'weekly' ? 28 : 14;
      const { from, to } = rangeOrDefault(query, days);
      const rows = txInRange(from, to).filter(
        (t) => t.merchantId === params.id && t.status === 'success',
      );
      const byDay = new Map<string, { volume: number; count: number }>();
      for (const t of rows) {
        const k = dayKey(t.occurredAt);
        const cur = byDay.get(k) ?? { volume: 0, count: 0 };
        cur.volume += t.amount;
        cur.count += 1;
        byDay.set(k, cur);
      }
      return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v }));
    },
  ],
];

// ---------------------------------------------------------------- terminals

let terminalSeq = 401;

const terminalHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/terminals$/,
    ({ query }) => {
      let rows = db.terminals;
      const search = query.get('search')?.toLowerCase();
      if (search) {
        rows = rows.filter(
          (t) =>
            t.id.toLowerCase().includes(search) ||
            t.serialNumber.toLowerCase().includes(search) ||
            t.locationAddress.toLowerCase().includes(search) ||
            merchantName(t.merchantId).toLowerCase().includes(search),
        );
      }
      const status = query.getAll('status');
      if (status.length) rows = rows.filter((t) => status.includes(t.status));
      const merchantId = query.get('merchantId');
      if (merchantId) rows = rows.filter((t) => t.merchantId === merchantId);
      rows = sortRows(rows, query, 'id');
      if (query.get('sort') === undefined && !query.get('sort')) {
        rows = [...rows].sort((a, b) => a.id.localeCompare(b.id));
      }
      return paginate(rows, query);
    },
  ],
  [
    'GET',
    /^\/terminals\/(?<id>[^/]+)$/,
    ({ params }) => {
      const t = db.terminals.find((x) => x.id === params.id);
      if (!t) throw new ApiError(404, 'Terminal not found');
      return t;
    },
  ],
  [
    'POST',
    /^\/terminals$/,
    ({ body }) => {
      const input = body as Partial<Terminal>;
      const terminal: Terminal = {
        id: `MP-${terminalSeq++}`,
        serialNumber: input.serialNumber ?? `SN${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
        status: 'offline',
        merchantId: input.merchantId ?? null,
        locationAddress: input.locationAddress ?? '',
        installedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        firmwareVersion: input.firmwareVersion ?? '2.5.2',
        uptimePercent30d: 100,
        activityLog: [
          { at: new Date().toISOString(), event: 'installed', detail: 'Terminal registered' },
        ],
      };
      db.terminals.unshift(terminal);
      if (terminal.merchantId) {
        db.merchants.find((m) => m.id === terminal.merchantId)?.terminalIds.push(terminal.id);
      }
      appendAudit({ action: 'create', entity: 'terminal', entityId: terminal.id });
      return terminal;
    },
  ],
  [
    'PATCH',
    /^\/terminals\/(?<id>[^/]+)$/,
    ({ params, body }) => {
      const t = db.terminals.find((x) => x.id === params.id);
      if (!t) throw new ApiError(404, 'Terminal not found');
      const input = body as Partial<Terminal>;
      const changes: { field: string; from: string; to: string }[] = [];
      if (input.status && input.status !== t.status) {
        changes.push({ field: 'status', from: t.status, to: input.status });
        t.activityLog.push({
          at: new Date().toISOString(),
          event: 'status_change',
          detail: `Status changed to ${input.status}`,
        });
      }
      if (input.merchantId !== undefined && input.merchantId !== t.merchantId) {
        changes.push({
          field: 'merchantId',
          from: t.merchantId ?? 'unassigned',
          to: input.merchantId ?? 'unassigned',
        });
        if (t.merchantId) {
          const prev = db.merchants.find((m) => m.id === t.merchantId);
          if (prev) prev.terminalIds = prev.terminalIds.filter((id) => id !== t.id);
        }
        if (input.merchantId) {
          db.merchants.find((m) => m.id === input.merchantId)?.terminalIds.push(t.id);
        }
        t.activityLog.push({
          at: new Date().toISOString(),
          event: 'assignment',
          detail: input.merchantId
            ? `Assigned to ${merchantName(input.merchantId)}`
            : 'Detached from merchant',
        });
      }
      Object.assign(t, { ...input, id: t.id, activityLog: t.activityLog });
      appendAudit({
        action: 'update',
        entity: 'terminal',
        entityId: t.id,
        changes: changes.length ? changes : undefined,
      });
      return t;
    },
  ],
];

// ------------------------------------------------------------- transactions

const txHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/transactions$/,
    ({ query }) => {
      let rows = db.transactions;
      const search = query.get('search')?.toLowerCase();
      if (search) {
        rows = rows.filter(
          (t) =>
            t.id.toLowerCase().includes(search) ||
            t.terminalId.toLowerCase().includes(search) ||
            merchantName(t.merchantId).toLowerCase().includes(search),
        );
      }
      const status = query.getAll('status');
      if (status.length) rows = rows.filter((t) => status.includes(t.status));
      const settlement = query.getAll('settlementStatus');
      if (settlement.length) rows = rows.filter((t) => settlement.includes(t.settlementStatus));
      const merchantIds = query.getAll('merchantId');
      if (merchantIds.length) rows = rows.filter((t) => merchantIds.includes(t.merchantId));
      const terminalId = query.get('terminalId');
      if (terminalId) rows = rows.filter((t) => t.terminalId === terminalId);
      const failureReason = query.getAll('failureReason');
      if (failureReason.length) {
        rows = rows.filter((t) => t.failureReason && failureReason.includes(t.failureReason));
      }
      const method = query.get('method');
      if (method) rows = rows.filter((t) => t.method === method);
      const amountMin = query.get('amountMin');
      if (amountMin) rows = rows.filter((t) => t.amount >= Number(amountMin));
      const amountMax = query.get('amountMax');
      if (amountMax) rows = rows.filter((t) => t.amount <= Number(amountMax));
      rows = rows.filter((t) => withinRange(t.occurredAt, query));
      rows = sortRows(rows, query, 'occurredAt');
      return paginate(rows, query);
    },
  ],
  [
    'GET',
    /^\/transactions\/(?<id>[^/]+)$/,
    ({ params }) => {
      const t = db.transactions.find((x) => x.id === params.id);
      if (!t) throw new ApiError(404, 'Transaction not found');
      return t;
    },
  ],
  [
    'GET',
    /^\/transactions\/(?<id>[^/]+)\/related$/,
    ({ params }) => {
      const t = db.transactions.find((x) => x.id === params.id);
      if (!t) throw new ApiError(404, 'Transaction not found');
      return db.transactions
        .filter((x) => x.terminalId === t.terminalId && x.id !== t.id)
        .slice(0, 6);
    },
  ],
];

// ------------------------------------------------------ failed transactions

const failedHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/failed-transactions\/summary$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 7);
      const rows = txInRange(from, to);
      const failed = rows.filter((t) => t.status === 'failed');
      const failRate = rows.length ? (failed.length / rows.length) * 100 : 0;
      return {
        failedCount: failed.length,
        totalCount: rows.length,
        failRate,
        threshold: 5,
        topReason: (['network_error', 'timeout', 'bank_decline', 'terminal_offline', 'auth_failed'] as const)
          .map((reason) => ({
            reason,
            count: failed.filter((t) => t.failureReason === reason).length,
          }))
          .sort((a, b) => b.count - a.count)[0],
      };
    },
  ],
  [
    'GET',
    /^\/failed-transactions\/by-reason$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 7);
      const failed = txInRange(from, to).filter((t) => t.status === 'failed');
      const reasons: TxFailureReason[] = [
        'network_error',
        'timeout',
        'bank_decline',
        'terminal_offline',
        'auth_failed',
      ];
      return reasons.map((reason) => ({
        reason,
        count: failed.filter((t) => t.failureReason === reason).length,
      }));
    },
  ],
  [
    'GET',
    /^\/failed-transactions\/rate-over-time$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 14);
      const rows = txInRange(from, to);
      const byDay = new Map<string, { total: number; failed: number }>();
      for (const t of rows) {
        const k = dayKey(t.occurredAt);
        const cur = byDay.get(k) ?? { total: 0, failed: 0 };
        cur.total += 1;
        if (t.status === 'failed') cur.failed += 1;
        byDay.set(k, cur);
      }
      return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          failRate: v.total ? Number(((v.failed / v.total) * 100).toFixed(2)) : 0,
          failed: v.failed,
          total: v.total,
        }));
    },
  ],
];

// ---------------------------------------------------------------- analytics

const analyticsHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/analytics\/summary$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const spanMs = new Date(to).getTime() - new Date(from).getTime();
      const prevFrom = new Date(new Date(from).getTime() - spanMs).toISOString();
      const cur = txInRange(from, to);
      const prev = txInRange(prevFrom, from);
      const volume = (rows: Transaction[]) =>
        rows.filter((t) => t.status === 'success').reduce((s, t) => s + t.amount, 0);
      const curVol = volume(cur);
      const prevVol = volume(prev);
      const curSuccess = cur.filter((t) => t.status === 'success');
      const settled = cur.filter((t) => t.status === 'success' || t.status === 'failed');
      return {
        turnover: curVol,
        turnoverDeltaPct: prevVol ? ((curVol - prevVol) / prevVol) * 100 : 0,
        txCount: cur.length,
        txCountDeltaPct: prev.length ? ((cur.length - prev.length) / prev.length) * 100 : 0,
        avgTicket: curSuccess.length ? curVol / curSuccess.length : 0,
        failRate: settled.length
          ? (cur.filter((t) => t.status === 'failed').length / settled.length) * 100
          : 0,
        commission: curSuccess.reduce((s, t) => s + t.commissionAmount, 0),
      };
    },
  ],
  [
    'GET',
    /^\/analytics\/turnover-series$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const rows = txInRange(from, to);
      const byDay = new Map<string, { volume: number; count: number; failed: number }>();
      for (const t of rows) {
        const k = dayKey(t.occurredAt);
        const cur = byDay.get(k) ?? { volume: 0, count: 0, failed: 0 };
        if (t.status === 'success') {
          cur.volume += t.amount;
          cur.count += 1;
        }
        if (t.status === 'failed') cur.failed += 1;
        byDay.set(k, cur);
      }
      return [...byDay.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({
          date,
          volume: Number(v.volume.toFixed(2)),
          count: v.count,
          failed: v.failed,
          avgTicket: v.count ? Number((v.volume / v.count).toFixed(2)) : 0,
        }));
    },
  ],
  [
    'GET',
    /^\/analytics\/by-merchant$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const rows = txInRange(from, to).filter((t) => t.status === 'success');
      const byMerchant = new Map<string, { volume: number; count: number; commission: number }>();
      for (const t of rows) {
        const cur = byMerchant.get(t.merchantId) ?? { volume: 0, count: 0, commission: 0 };
        cur.volume += t.amount;
        cur.count += 1;
        cur.commission += t.commissionAmount;
        byMerchant.set(t.merchantId, cur);
      }
      return [...byMerchant.entries()]
        .map(([id, v]) => {
          const m = db.merchants.find((x) => x.id === id);
          return {
            merchantId: id,
            merchantName: m?.name ?? id,
            commissionRate: m?.commissionRate ?? 0,
            volume: Number(v.volume.toFixed(2)),
            count: v.count,
            commission: Number(v.commission.toFixed(2)),
            avgTicket: Number((v.volume / v.count).toFixed(2)),
          };
        })
        .sort((a, b) => b.volume - a.volume);
    },
  ],
  [
    'GET',
    /^\/analytics\/by-terminal$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const rows = txInRange(from, to).filter((t) => t.status === 'success');
      const byTerminal = new Map<string, { volume: number; count: number }>();
      for (const t of rows) {
        const cur = byTerminal.get(t.terminalId) ?? { volume: 0, count: 0 };
        cur.volume += t.amount;
        cur.count += 1;
        byTerminal.set(t.terminalId, cur);
      }
      return [...byTerminal.entries()]
        .map(([id, v]) => {
          const t = db.terminals.find((x) => x.id === id);
          return {
            terminalId: id,
            merchantName: merchantName(t?.merchantId ?? null),
            location: t?.locationAddress ?? '—',
            status: t?.status ?? 'offline',
            volume: Number(v.volume.toFixed(2)),
            count: v.count,
          };
        })
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 50);
    },
  ],
  [
    'GET',
    /^\/analytics\/hourly-pattern$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const rows = txInRange(from, to).filter((t) => t.status === 'success');
      const buckets = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        volume: 0,
        count: 0,
      }));
      for (const t of rows) {
        const h = new Date(t.occurredAt).getHours();
        buckets[h].volume += t.amount;
        buckets[h].count += 1;
      }
      return buckets.map((b) => ({ ...b, volume: Number(b.volume.toFixed(2)) }));
    },
  ],
];

// -------------------------------------------------------------- commissions

const commissionHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/commissions\/summary$/,
    ({ query }) => {
      const { from, to } = rangeOrDefault(query, 30);
      const rows = txInRange(from, to).filter((t) => t.status === 'success');
      const byMerchant = new Map<string, { volume: number; commission: number; count: number }>();
      for (const t of rows) {
        const cur = byMerchant.get(t.merchantId) ?? { volume: 0, commission: 0, count: 0 };
        cur.volume += t.amount;
        cur.commission += t.commissionAmount;
        cur.count += 1;
        byMerchant.set(t.merchantId, cur);
      }
      const perMerchant = [...byMerchant.entries()]
        .map(([id, v]) => {
          const m = db.merchants.find((x) => x.id === id);
          return {
            merchantId: id,
            merchantName: m?.name ?? id,
            rate: m?.commissionRate ?? 0,
            volume: Number(v.volume.toFixed(2)),
            commission: Number(v.commission.toFixed(2)),
            txCount: v.count,
          };
        })
        .sort((a, b) => b.commission - a.commission);
      return {
        total: Number(perMerchant.reduce((s, m) => s + m.commission, 0).toFixed(2)),
        byMerchant: perMerchant,
      };
    },
  ],
];

// -------------------------------------------------------------------- users

let userSeq = db.users.length + 1;

const userHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/users$/,
    ({ query }) => {
      let rows = db.users;
      const search = query.get('search')?.toLowerCase();
      if (search) {
        rows = rows.filter(
          (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
        );
      }
      return paginate(rows, query);
    },
  ],
  [
    'POST',
    /^\/users$/,
    ({ body }) => {
      const input = body as Pick<AdminUser, 'name' | 'email' | 'role'>;
      const user: AdminUser = {
        id: `U-${String(userSeq++).padStart(3, '0')}`,
        name: input.name,
        email: input.email,
        role: input.role,
        status: 'active',
        twoFactorEnabled: false,
        lastLoginAt: new Date().toISOString(),
      };
      db.users.push(user);
      appendAudit({ action: 'create', entity: 'user', entityId: user.id });
      return user;
    },
  ],
  [
    'PATCH',
    /^\/users\/(?<id>[^/]+)$/,
    ({ params, body }) => {
      const u = db.users.find((x) => x.id === params.id);
      if (!u) throw new ApiError(404, 'User not found');
      const input = body as Partial<AdminUser>;
      const changes: { field: string; from: string; to: string }[] = [];
      if (input.role && input.role !== u.role) {
        changes.push({ field: 'role', from: u.role, to: input.role });
      }
      if (input.status && input.status !== u.status) {
        changes.push({ field: 'status', from: u.status, to: input.status });
      }
      Object.assign(u, { ...input, id: u.id });
      appendAudit({
        action: 'update',
        entity: 'user',
        entityId: u.id,
        changes: changes.length ? changes : undefined,
      });
      return u;
    },
  ],
];

// --------------------------------------------------------------- audit logs

const auditHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/audit-logs$/,
    ({ query }) => {
      let rows = db.auditLogs;
      const userId = query.get('userId');
      if (userId) rows = rows.filter((l) => l.userId === userId);
      const action = query.getAll('action');
      if (action.length) rows = rows.filter((l) => action.includes(l.action));
      const entity = query.get('entity');
      if (entity) rows = rows.filter((l) => l.entity === entity);
      rows = rows.filter((l) => withinRange(l.at, query));
      return paginate(rows, query);
    },
  ],
];

// ------------------------------------------------------------------- alerts

const alertHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/alerts$/,
    ({ query }) => {
      let rows = db.alerts;
      const severity = query.getAll('severity');
      if (severity.length) rows = rows.filter((a) => severity.includes(a.severity));
      const ack = query.get('acknowledged');
      if (ack !== null) rows = rows.filter((a) => a.acknowledged === (ack === 'true'));
      return paginate(rows, query);
    },
  ],
  [
    'GET',
    /^\/alerts\/unread-count$/,
    () => ({ count: db.alerts.filter((a) => !a.acknowledged).length }),
  ],
  [
    'GET',
    /^\/alerts\/latest$/,
    () => db.alerts.slice(0, 5),
  ],
  [
    'PATCH',
    /^\/alerts\/(?<id>[^/]+)$/,
    ({ params, body }) => {
      const a = db.alerts.find((x) => x.id === params.id);
      if (!a) throw new ApiError(404, 'Alert not found');
      Object.assign(a, body as Partial<SystemAlert>, { id: a.id });
      return a;
    },
  ],
  [
    'POST',
    /^\/alerts\/acknowledge-all$/,
    () => {
      for (const a of db.alerts) a.acknowledged = true;
      return { ok: true };
    },
  ],
];

// -------------------------------------------------------------- system logs

const systemLogHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/system-logs$/,
    ({ query }) => {
      let rows = db.systemLogs;
      const level = query.getAll('level');
      if (level.length) rows = rows.filter((l) => level.includes(l.level));
      const service = query.get('service');
      if (service) rows = rows.filter((l) => l.service === service);
      const search = query.get('search')?.toLowerCase();
      if (search) rows = rows.filter((l) => l.message.toLowerCase().includes(search));
      return paginate(rows, query);
    },
  ],
];

// ------------------------------------------------------------------ reports

let exportSeq = db.exportRecords.length + 1;

const reportHandlers: [Method, RegExp, Handler][] = [
  ['GET', /^\/reports\/exports$/, () => db.exportRecords],
  [
    'POST',
    /^\/reports\/export$/,
    ({ body }) => {
      const input = body as { report: string; format: 'csv' | 'pdf' | 'xlsx'; scope: string };
      const record = {
        id: `EXP-${String(exportSeq++).padStart(3, '0')}`,
        at: new Date().toISOString(),
        report: input.report,
        format: input.format,
        byUser: 'You',
        scope: input.scope,
      };
      db.exportRecords.unshift(record);
      appendAudit({ action: 'export', entity: 'report', entityId: record.id });
      return record;
    },
  ],
];

// ----------------------------------------------------------------- settings

let keySeq = db.apiKeys.length + 1;

const settingsHandlers: [Method, RegExp, Handler][] = [
  ['GET', /^\/settings\/api-keys$/, () => db.apiKeys],
  [
    'POST',
    /^\/settings\/api-keys$/,
    ({ body }) => {
      const input = body as { name: string };
      const secret = `pk_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
      const key = {
        id: `KEY-${String(keySeq++).padStart(3, '0')}`,
        name: input.name,
        prefix: secret.slice(0, 12),
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revoked: false,
      };
      db.apiKeys.unshift(key);
      appendAudit({ action: 'create', entity: 'api_key', entityId: key.id });
      return { ...key, secret };
    },
  ],
  [
    'PATCH',
    /^\/settings\/api-keys\/(?<id>[^/]+)$/,
    ({ params, body }) => {
      const k = db.apiKeys.find((x) => x.id === params.id);
      if (!k) throw new ApiError(404, 'API key not found');
      Object.assign(k, body as { revoked?: boolean }, { id: k.id });
      appendAudit({ action: 'update', entity: 'api_key', entityId: k.id });
      return k;
    },
  ],
  [
    'PATCH',
    /^\/settings\/profile$/,
    ({ body }) => {
      appendAudit({ action: 'settings_change', entity: 'profile' });
      return { ok: true, ...(body as object) };
    },
  ],
  [
    'POST',
    /^\/settings\/change-password$/,
    () => {
      appendAudit({ action: 'settings_change', entity: 'password' });
      return { ok: true };
    },
  ],
  [
    'POST',
    /^\/settings\/2fa$/,
    ({ body }) => {
      const { enabled, code } = body as { enabled: boolean; code?: string };
      if (enabled && code !== '000000') throw new ApiError(400, 'Invalid confirmation code');
      appendAudit({ action: 'settings_change', entity: '2fa' });
      return { ok: true, enabled };
    },
  ],
];

// ------------------------------------------------------------------- search

const searchHandlers: [Method, RegExp, Handler][] = [
  [
    'GET',
    /^\/search$/,
    ({ query }) => {
      const q = (query.get('q') ?? '').toLowerCase();
      if (q.length < 2) return { merchants: [], terminals: [], transactions: [], users: [] };
      return {
        merchants: db.merchants
          .filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
          .slice(0, 5)
          .map((m) => ({ id: m.id, name: m.name, status: m.status })),
        terminals: db.terminals
          .filter(
            (t) =>
              t.id.toLowerCase().includes(q) ||
              t.serialNumber.toLowerCase().includes(q) ||
              t.locationAddress.toLowerCase().includes(q),
          )
          .slice(0, 5)
          .map((t) => ({ id: t.id, location: t.locationAddress, status: t.status })),
        transactions: db.transactions
          .filter((t) => t.id.toLowerCase().includes(q))
          .slice(0, 5)
          .map((t) => ({ id: t.id, amount: t.amount, status: t.status })),
        users: db.users
          .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
          .slice(0, 3)
          .map((u) => ({ id: u.id, name: u.name, email: u.email })),
      };
    },
  ],
];

// ----------------------------------------------------------------- dispatch

const routes: [Method, RegExp, Handler][] = [
  ...authHandlers,
  ...dashboardHandlers,
  ...merchantHandlers,
  ...terminalHandlers,
  ...txHandlers,
  ...failedHandlers,
  ...analyticsHandlers,
  ...commissionHandlers,
  ...userHandlers,
  ...auditHandlers,
  ...alertHandlers,
  ...systemLogHandlers,
  ...reportHandlers,
  ...settingsHandlers,
  ...searchHandlers,
];

export async function mockRequest<T>(
  method: Method,
  path: string,
  opts: { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  await delay();
  const query = new URLSearchParams();
  if (opts.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) for (const v of value) query.append(key, v);
      else query.set(key, String(value));
    }
  }
  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (!match) continue;
    return handler({
      params: (match.groups ?? {}) as Record<string, string>,
      query,
      body: opts.body,
    }) as T;
  }
  throw new ApiError(404, `No mock handler for ${method} ${path}`);
}
