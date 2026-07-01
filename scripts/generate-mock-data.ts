/**
 * Generates deterministic mock JSON into src/mocks/data/.
 * Run with: pnpm generate:mocks
 * Timestamps are re-anchored to "now" at runtime by src/mocks/db.ts,
 * so the data never goes stale.
 */
import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

faker.seed(20260612);

const OUT = path.resolve(import.meta.dirname, '../src/mocks/data');
mkdirSync(OUT, { recursive: true });

const NOW = new Date('2026-06-12T12:00:00.000Z').getTime();
const DAY = 86_400_000;
const HOUR = 3_600_000;

const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------- merchants
const MERCHANT_NAMES = [
  'Agrohub Vake', 'Gastronom Saburtalo', 'Goodwill Dighomi', 'Nikora Gldani',
  'PSP Vera', 'Carrefour City Mall', 'Spar Vazha-Pshavela', 'Fresco Isani',
  'Zgapari Mtatsminda', 'Libre Chugureti', 'Magniti Didube', 'Ori Nabiji Varketili',
  'Daily Marjanishvili', 'Smart Avlabari', 'Europroduct Ortachala', 'Aversi Vake',
  'GPC Saburtalo', 'Pharmadepot Gldani', 'Biblusi Rustaveli', 'Elit Electronics Pekini',
  'Zoommer Tsereteli', 'Alta Vake', 'Veli Store Didi Dighomi', 'Gulfstream Sololaki',
  'Wendys Marjanishvili', 'Dunkin Rustaveli', 'Entree Vera', 'Coffeesta Chavchavadze',
  'Luca Polare Old Town', 'Mapshalia Aghmashenebeli', 'Shemoikhede Genatsvale',
  'Machakhela Saburtalo', 'Pasanauri Gldani', 'Tsiskvili Beliashvili',
  'Funicular Restaurant', 'KFC Station Square', 'McDonalds Marjanishvili',
  'Subway Pekini', 'Bazari Orbeliani', 'Deserter Bazaar Trade',
  'Lilo Mall Trading', 'East Point Retail', 'Tbilisi Mall Foodcourt',
  'Galleria Tbilisi Shop', 'Axis Towers Cafe', 'Pixel Mall Electronics',
  'Merani Mall Boutique', 'Karvasla Vintage', 'Vagzlis Bazroba Goods', 'Eliava Market Tools',
];

const STREETS = [
  'Chavchavadze Ave', 'Rustaveli Ave', 'Pekini Ave', 'Vazha-Pshavela Ave',
  'Aghmashenebeli Ave', 'Tsereteli Ave', 'Kazbegi Ave', 'Marjanishvili St',
  'Abashidze St', 'Paliashvili St', 'Beliashvili St', 'Gorgasali St',
  'Ketevan Tsamebuli Ave', 'Guramishvili Ave', 'Nutsubidze St', 'Mosashvili St',
];

const tbilisiAddress = () =>
  `${faker.number.int({ min: 1, max: 180 })} ${faker.helpers.arrayElement(STREETS)}, Tbilisi`;

const GEORGIAN_FIRST = ['Giorgi', 'Nino', 'Davit', 'Tamar', 'Levan', 'Ana', 'Irakli', 'Mariam', 'Zurab', 'Salome', 'Nika', 'Ketevan', 'Lasha', 'Natia', 'Beka', 'Tea'];
const GEORGIAN_LAST = ['Beridze', 'Kapanadze', 'Gelashvili', 'Maisuradze', 'Lomidze', 'Tsiklauri', 'Abashidze', 'Khutsishvili', 'Janelidze', 'Megrelishvili', 'Chikovani', 'Kvaratskhelia'];
const georgianName = () =>
  `${faker.helpers.arrayElement(GEORGIAN_FIRST)} ${faker.helpers.arrayElement(GEORGIAN_LAST)}`;

type MerchantStatus = 'active' | 'suspended' | 'pending_kyc' | 'closed';

const merchants = MERCHANT_NAMES.map((name, i) => {
  const status: MerchantStatus = faker.helpers.weightedArrayElement([
    { value: 'active' as const, weight: 80 },
    { value: 'suspended' as const, weight: 7 },
    { value: 'pending_kyc' as const, weight: 9 },
    { value: 'closed' as const, weight: 4 },
  ]);
  const createdAt = NOW - faker.number.int({ min: 40, max: 900 }) * DAY;
  const rate = faker.helpers.arrayElement([1.2, 1.5, 1.8, 2.0, 2.2, 2.5, 2.8]);
  const docs = Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, (_, d) => ({
    id: `DOC-${i + 1}-${d + 1}`,
    name: faker.helpers.arrayElement([
      'Business registration extract.pdf', 'Tax certificate.pdf', 'Bank details.pdf',
      'KYC questionnaire.pdf', 'Lease agreement.pdf', 'Director ID copy.pdf',
    ]),
    type: 'application/pdf',
    uploadedAt: iso(createdAt + faker.number.int({ min: 0, max: 30 }) * DAY),
    url: '#',
  }));
  const history = [
    { rate, changedAt: iso(createdAt), changedBy: 'System' },
  ];
  return {
    id: `M-${String(i + 1).padStart(3, '0')}`,
    name,
    legalName: `${name.split(' ')[0]} LLC`,
    taxId: String(faker.number.int({ min: 200000000, max: 449999999 })),
    status,
    contact: {
      person: georgianName(),
      phone: `+995 5${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)}`,
      email: `office@${name.toLowerCase().replace(/[^a-z]+/g, '')}.ge`,
      address: tbilisiAddress(),
    },
    terminalIds: [] as string[],
    turnover: { today: 0, week: 0, month: 0 },
    commissionRate: rate,
    commissionHistory: history,
    documents: docs,
    createdAt: iso(createdAt),
  };
});

// ---------------------------------------------------------------- terminals
type TerminalStatus = 'online' | 'offline' | 'maintenance' | 'decommissioned';

const activeMerchants = merchants.filter((m) => m.status === 'active');
const terminals = Array.from({ length: 300 }, (_, i) => {
  const id = `MP-${String(i + 101).padStart(3, '0')}`;
  const assigned = faker.number.float({ min: 0, max: 1 }) < 0.93;
  const merchant = assigned ? faker.helpers.arrayElement(activeMerchants) : null;
  if (merchant) merchant.terminalIds.push(id);
  const status: TerminalStatus = !merchant
    ? faker.helpers.arrayElement(['offline', 'decommissioned'] as const)
    : faker.helpers.weightedArrayElement([
        { value: 'online' as const, weight: 84 },
        { value: 'offline' as const, weight: 8 },
        { value: 'maintenance' as const, weight: 6 },
        { value: 'decommissioned' as const, weight: 2 },
      ]);
  const installedAt = NOW - faker.number.int({ min: 30, max: 700 }) * DAY;
  const lastSeenAt =
    status === 'online'
      ? NOW - faker.number.int({ min: 1, max: 14 }) * 60_000
      : NOW - faker.number.int({ min: 2, max: 96 }) * HOUR;
  const fw = faker.helpers.arrayElement(['2.4.1', '2.4.3', '2.5.0', '2.5.2', '3.0.0-beta.2']);
  const events = [
    { at: iso(installedAt), event: 'installed', detail: 'Terminal installed and activated' },
    ...Array.from({ length: faker.number.int({ min: 2, max: 7 }) }, () => {
      const kind = faker.helpers.arrayElement([
        ['status_change', 'Status changed to online'],
        ['status_change', 'Status changed to offline'],
        ['disconnect', 'Network connection lost'],
        ['reconnect', 'Network connection restored'],
        ['firmware_update', `Firmware updated to ${fw}`],
        ['maintenance', 'Scheduled maintenance performed'],
      ] as const);
      return {
        at: iso(installedAt + faker.number.int({ min: 1, max: Math.max(2, Math.floor((NOW - installedAt) / DAY)) }) * DAY),
        event: kind[0],
        detail: kind[1],
      };
    }),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return {
    id,
    serialNumber: `SN${faker.string.alphanumeric({ length: 10, casing: 'upper' })}`,
    status,
    merchantId: merchant?.id ?? null,
    locationAddress: merchant ? merchant.contact.address : 'Warehouse — 14 Moscow Ave, Tbilisi',
    installedAt: iso(installedAt),
    lastSeenAt: iso(lastSeenAt),
    firmwareVersion: fw,
    uptimePercent30d:
      status === 'online'
        ? faker.number.float({ min: 97.5, max: 99.99, fractionDigits: 2 })
        : faker.number.float({ min: 62, max: 97, fractionDigits: 2 }),
    activityLog: events,
  };
});

// ------------------------------------------------------------- transactions
type TxStatus = 'success' | 'failed' | 'pending' | 'refunded';
type FailureReason = 'network_error' | 'timeout' | 'bank_decline' | 'terminal_offline' | 'auth_failed';

const ERROR_CODES: Record<FailureReason, string> = {
  network_error: 'E-NET-503',
  timeout: 'E-TMO-408',
  bank_decline: 'E-BNK-005',
  terminal_offline: 'E-TRM-410',
  auth_failed: 'E-PALM-401',
};

// hourly weights: quiet nights, lunch + evening peaks
const HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 4, 8, 12, 14, 16, 18, 22, 24, 18, 16, 15, 17, 22, 26, 22, 14, 8, 4];

const assignedTerminals = terminals.filter((t) => t.merchantId && t.status !== 'decommissioned');
let txSeq = 900_001;

const transactions = Array.from({ length: 5000 }, () => {
  const terminal = faker.helpers.arrayElement(assignedTerminals);
  const daysAgo = faker.number.int({ min: 0, max: 29 });
  const hour = faker.helpers.weightedArrayElement(
    HOUR_WEIGHTS.map((weight, value) => ({ value, weight })),
  );
  // keep "today" transactions in the past relative to the noon anchor
  const cappedHour = daysAgo === 0 ? Math.min(hour, 11) : hour;
  const occurred =
    NOW - daysAgo * DAY - (11 - cappedHour) * HOUR + faker.number.int({ min: 0, max: 59 }) * 60_000;
  const status: TxStatus = faker.helpers.weightedArrayElement([
    { value: 'success' as const, weight: 945 },
    { value: 'failed' as const, weight: 25 },
    { value: 'pending' as const, weight: 15 },
    { value: 'refunded' as const, weight: 15 },
  ]);
  const failureReason =
    status === 'failed'
      ? faker.helpers.weightedArrayElement([
          { value: 'network_error' as const, weight: 30 },
          { value: 'timeout' as const, weight: 22 },
          { value: 'bank_decline' as const, weight: 25 },
          { value: 'terminal_offline' as const, weight: 13 },
          { value: 'auth_failed' as const, weight: 10 },
        ])
      : undefined;
  const amount = faker.number.float({ min: 2.5, max: 850, fractionDigits: 2 });
  const merchant = merchants.find((m) => m.id === terminal.merchantId)!;
  const settlementStatus =
    status !== 'success'
      ? ('pending' as const)
      : daysAgo === 0
        ? ('pending' as const)
        : faker.helpers.weightedArrayElement([
            { value: 'settled' as const, weight: 90 },
            { value: 'delayed' as const, weight: 6 },
            { value: 'on_hold' as const, weight: 4 },
          ]);
  return {
    id: `TX-${txSeq++}`,
    occurredAt: iso(occurred),
    merchantId: merchant.id,
    terminalId: terminal.id,
    amount,
    currency: 'GEL' as const,
    method: faker.helpers.weightedArrayElement([
      { value: 'palm_authentication' as const, weight: 86 },
      { value: 'card_fallback' as const, weight: 14 },
    ]),
    status,
    errorCode: failureReason ? ERROR_CODES[failureReason] : undefined,
    failureReason,
    settlementStatus,
    settledAt: settlementStatus === 'settled' ? iso(occurred + DAY) : undefined,
    commissionAmount: Number(((amount * merchant.commissionRate) / 100).toFixed(2)),
  };
}).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

// merchant turnover from successful transactions
for (const m of merchants) {
  const mine = transactions.filter((t) => t.merchantId === m.id && t.status === 'success');
  const sum = (since: number) =>
    Number(
      mine
        .filter((t) => new Date(t.occurredAt).getTime() >= since)
        .reduce((acc, t) => acc + t.amount, 0)
        .toFixed(2),
    );
  m.turnover = {
    today: sum(NOW - 12 * HOUR),
    week: sum(NOW - 7 * DAY),
    month: sum(NOW - 30 * DAY),
  };
}

// ------------------------------------------------------------------- users
const users = [
  { id: 'U-001', name: 'Rafael Serobian', email: 'admin@multipay.ge', role: 'super_admin' },
  { id: 'U-002', name: 'Tamar Kapanadze', email: 'finance@multipay.ge', role: 'finance_admin' },
  { id: 'U-003', name: 'Giorgi Beridze', email: 'ops@multipay.ge', role: 'operations_manager' },
  { id: 'U-004', name: 'Levan Maisuradze', email: 'tech@multipay.ge', role: 'technical_support' },
  { id: 'U-005', name: 'Nino Gelashvili', email: 'support@multipay.ge', role: 'merchant_support' },
  { id: 'U-006', name: 'Ana Lomidze', email: 'viewer@multipay.ge', role: 'viewer' },
  { id: 'U-007', name: 'Irakli Tsiklauri', email: 'irakli.t@multipay.ge', role: 'operations_manager' },
  { id: 'U-008', name: 'Mariam Abashidze', email: 'mariam.a@multipay.ge', role: 'merchant_support' },
].map((u, i) => ({
  ...u,
  status: 'active' as const,
  twoFactorEnabled: i < 6,
  lastLoginAt: iso(NOW - faker.number.int({ min: 1, max: 96 }) * HOUR),
}));

// -------------------------------------------------------------- audit logs
const AUDIT_ACTIONS = ['login', 'logout', 'create', 'update', 'delete', 'export', 'settings_change'] as const;
const auditLogs = Array.from({ length: 260 }, (_, i) => {
  const user = faker.helpers.arrayElement(users);
  const action = faker.helpers.weightedArrayElement([
    { value: 'login' as const, weight: 30 },
    { value: 'logout' as const, weight: 25 },
    { value: 'update' as const, weight: 20 },
    { value: 'create' as const, weight: 10 },
    { value: 'export' as const, weight: 8 },
    { value: 'delete' as const, weight: 3 },
    { value: 'settings_change' as const, weight: 4 },
  ]);
  const entityKind = faker.helpers.arrayElement(['merchant', 'terminal', 'user', 'commission', 'report'] as const);
  const isSession = action === 'login' || action === 'logout';
  const changes =
    action === 'update'
      ? [
          faker.helpers.arrayElement([
            { field: 'status', from: 'active', to: 'suspended' },
            { field: 'commissionRate', from: '2.0', to: '1.8' },
            { field: 'contact.phone', from: '+995 555 11 22 33', to: '+995 599 44 55 66' },
            { field: 'status', from: 'offline', to: 'maintenance' },
            { field: 'role', from: 'viewer', to: 'merchant_support' },
          ]),
        ]
      : undefined;
  return {
    id: `AUD-${String(i + 1).padStart(4, '0')}`,
    at: iso(NOW - faker.number.int({ min: 10, max: 30 * 24 * 60 }) * 60_000),
    userId: user.id,
    userName: user.name,
    action,
    entity: isSession ? 'session' : entityKind,
    entityId: isSession
      ? undefined
      : entityKind === 'merchant'
        ? faker.helpers.arrayElement(merchants).id
        : entityKind === 'terminal'
          ? faker.helpers.arrayElement(terminals).id
          : undefined,
    changes,
    ip: `91.151.${faker.number.int({ min: 128, max: 159 })}.${faker.number.int({ min: 1, max: 254 })}`,
  };
}).sort((a, b) => b.at.localeCompare(a.at));
void AUDIT_ACTIONS;

// ------------------------------------------------------------------ alerts
const offlineTerminals = terminals.filter((t) => t.status === 'offline' && t.merchantId).slice(0, 6);
const alerts = [
  {
    id: 'AL-001',
    at: iso(NOW - 18 * 60_000),
    severity: 'critical' as const,
    type: 'failed_auth_spike' as const,
    title: 'Possible fraud attempt detected',
    description: `5 failed palm authentications in 3 minutes at terminal ${offlineTerminals[0]?.id ?? 'MP-118'}`,
    acknowledged: false,
    relatedEntity: { kind: 'terminal' as const, id: offlineTerminals[0]?.id ?? 'MP-118' },
  },
  {
    id: 'AL-002',
    at: iso(NOW - 42 * 60_000),
    severity: 'warning' as const,
    type: 'terminal_offline' as const,
    title: 'Terminal offline',
    description: `${offlineTerminals[1]?.id ?? 'MP-204'} has been unreachable for 40+ minutes`,
    acknowledged: false,
    relatedEntity: { kind: 'terminal' as const, id: offlineTerminals[1]?.id ?? 'MP-204' },
  },
  {
    id: 'AL-003',
    at: iso(NOW - 2 * HOUR),
    severity: 'ok' as const,
    type: 'aml_status' as const,
    title: 'AML screening passed',
    description: 'Daily AML batch screening completed — no matches found',
    acknowledged: true,
  },
  ...offlineTerminals.slice(2).map((t, i) => ({
    id: `AL-${String(i + 4).padStart(3, '0')}`,
    at: iso(NOW - faker.number.int({ min: 2, max: 40 }) * HOUR),
    severity: 'warning' as const,
    type: 'terminal_offline' as const,
    title: 'Terminal offline',
    description: `${t.id} at ${t.locationAddress} lost connection`,
    acknowledged: faker.datatype.boolean(),
    relatedEntity: { kind: 'terminal' as const, id: t.id },
  })),
  ...Array.from({ length: 14 }, (_, i) => {
    const kind = faker.helpers.arrayElement([
      {
        severity: 'critical' as const, type: 'fail_rate_spike' as const,
        title: 'Elevated failure rate',
        description: 'Transaction failure rate exceeded 5% threshold over the last hour',
      },
      {
        severity: 'warning' as const, type: 'low_turnover' as const,
        title: 'Low merchant turnover',
        description: `${faker.helpers.arrayElement(activeMerchants).name} turnover dropped 60% vs weekly average`,
      },
      {
        severity: 'info' as const, type: 'maintenance' as const,
        title: 'Scheduled maintenance',
        description: 'Firmware rollout 2.5.2 scheduled for tonight 02:00–04:00',
      },
      {
        severity: 'warning' as const, type: 'settlement_delay' as const,
        title: 'Settlement delay',
        description: 'Bank settlement batch delayed by more than 6 hours',
      },
    ]);
    return {
      id: `AL-${String(i + 10).padStart(3, '0')}`,
      at: iso(NOW - faker.number.int({ min: 3, max: 7 * 24 }) * HOUR),
      acknowledged: faker.datatype.boolean(),
      ...kind,
    };
  }),
].sort((a, b) => b.at.localeCompare(a.at));

// ------------------------------------------------------------- system logs
const SERVICES = ['auth-svc', 'tx-gateway', 'settlement-svc', 'terminal-hub', 'notification-svc', 'api-core'];
const LOG_TEMPLATES: [string, string][] = [
  ['info', 'Health check OK ({svc})'],
  ['info', 'Settlement batch #%d processed: %d transactions'],
  ['info', 'Terminal %s heartbeat received'],
  ['debug', 'Cache refreshed for merchant aggregates'],
  ['warn', 'Slow query detected: tx lookup took %dms'],
  ['warn', 'Retrying webhook delivery (attempt %d/5)'],
  ['error', 'Terminal %s connection reset by peer'],
  ['error', 'Bank API returned HTTP 503 — circuit breaker opened'],
];
const systemLogs = Array.from({ length: 400 }, (_, i) => {
  const [level, template] = faker.helpers.weightedArrayElement([
    { value: LOG_TEMPLATES[0], weight: 25 },
    { value: LOG_TEMPLATES[1], weight: 15 },
    { value: LOG_TEMPLATES[2], weight: 20 },
    { value: LOG_TEMPLATES[3], weight: 12 },
    { value: LOG_TEMPLATES[4], weight: 10 },
    { value: LOG_TEMPLATES[5], weight: 8 },
    { value: LOG_TEMPLATES[6], weight: 6 },
    { value: LOG_TEMPLATES[7], weight: 4 },
  ]);
  const message = template
    .replace('{svc}', faker.helpers.arrayElement(SERVICES))
    .replace('%s', faker.helpers.arrayElement(terminals).id)
    .replace('%d', String(faker.number.int({ min: 100, max: 9000 })))
    .replace('%d', String(faker.number.int({ min: 1, max: 400 })));
  return {
    id: `LOG-${String(i + 1).padStart(5, '0')}`,
    at: iso(NOW - faker.number.int({ min: 1, max: 72 * 60 }) * 60_000),
    level: level as 'debug' | 'info' | 'warn' | 'error',
    service: faker.helpers.arrayElement(SERVICES),
    message,
  };
}).sort((a, b) => b.at.localeCompare(a.at));

// ---------------------------------------------------------------- api keys
const apiKeys = [
  {
    id: 'KEY-001', name: 'Reporting integration', prefix: 'pk_live_8f3a',
    createdAt: iso(NOW - 90 * DAY), lastUsedAt: iso(NOW - 3 * HOUR), revoked: false,
  },
  {
    id: 'KEY-002', name: 'Legacy dashboard (deprecated)', prefix: 'pk_live_2c1e',
    createdAt: iso(NOW - 300 * DAY), lastUsedAt: iso(NOW - 45 * DAY), revoked: true,
  },
];

// ----------------------------------------------------------------- exports
const exportRecords = Array.from({ length: 8 }, (_, i) => ({
  id: `EXP-${String(i + 1).padStart(3, '0')}`,
  at: iso(NOW - faker.number.int({ min: 4, max: 20 * 24 }) * HOUR),
  report: faker.helpers.arrayElement(['Turnover report', 'Settlement report', 'Failed transactions report']),
  format: faker.helpers.arrayElement(['csv', 'pdf', 'xlsx'] as const),
  byUser: faker.helpers.arrayElement(users.slice(0, 3)).name,
  scope: faker.helpers.arrayElement(['All merchants — last 30 days', 'Agrohub Vake — last 7 days', 'All merchants — May 2026']),
})).sort((a, b) => b.at.localeCompare(a.at));

// ------------------------------------------------------------------- write
const write = (name: string, data: unknown) =>
  writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));

write('meta.json', { generatedAt: iso(NOW), seed: 20260612 });
write('merchants.json', merchants);
write('terminals.json', terminals);
write('transactions.json', transactions);
write('users.json', users);
write('audit-logs.json', auditLogs);
write('alerts.json', alerts);
write('system-logs.json', systemLogs);
write('api-keys.json', apiKeys);
write('export-records.json', exportRecords);

console.log(`Mock data written to ${OUT}`);
console.log(`merchants=${merchants.length} terminals=${terminals.length} transactions=${transactions.length}`);
