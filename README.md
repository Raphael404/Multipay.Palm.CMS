# Multipay — Palm Pay Admin Panel

Web-based CMS for the Palm Pay palm-vein payment infrastructure: operational, financial and
technical management of merchants, palm-authentication terminals and transactions in Georgia 🇬🇪.

Dark-navy fintech dashboard built with **React 19 + TypeScript (strict) + Vite + Tailwind v4 +
shadcn/ui + TanStack Router/Query/Table + Recharts + Zod + Zustand**.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # type-check + production build
```

No backend needed — the app ships with a realistic mock data layer (see below).

## Demo credentials

Password for every account: **`palmpay123`** · 2FA code: **`000000`**

| Role | Email | What you can do |
|---|---|---|
| Super Admin | `admin@multipay.ge` | Everything incl. user management, API keys |
| Finance Admin | `finance@multipay.ge` | + commissions, settlements, report export |
| Operations Manager | `ops@multipay.ge` | Merchants/terminals/transactions r/w, alerts |
| Technical Support | `tech@multipay.ge` | Terminals r/w, system logs |
| Merchant Support | `support@multipay.ge` | Merchants r/w, transactions read |
| Viewer | `viewer@multipay.ge` | Read-only everywhere (all mutations hidden) |

Log in as `viewer@multipay.ge` and then as `admin@multipay.ge` to see the RBAC difference.

## Modules

Dashboard (live KPIs, hourly volume, success/fail donut, alerts, recent tx) · Merchants
(CRUD + detail tabs: terminals/turnover/transactions/documents/commission) · Palm Terminals
(fleet table, assign/detach, status with confirm + audit, activity timeline, uptime) ·
Transactions (advanced filters, detail sheet with settlement timeline & commission breakdown,
CSV/Excel/PDF export) · Failed Monitoring (fail-rate KPIs, by-reason chart, threshold alert) ·
Analytics (period picker in URL, by merchant/terminal, hourly pattern, avg ticket) ·
Commissions (editable per-merchant rate with double confirm) · Users & Roles (six fixed roles)
· Audit Logs (field-level diffs, login history) · Alerts (severity groups, acknowledge) ·
System Logs (live tail) · Reports (builder + preview + export history) · Settings (profile,
2FA, session timeout, notifications, API keys — Super Admin only).

Global search: press **⌘K** anywhere.

## Architecture: how the API layer works (and how to swap in the real backend)

Every feature calls the REST client in [`src/lib/api-client.ts`](src/lib/api-client.ts):

```ts
api.get<Paginated<Merchant>>('/merchants', { page, search, status })
api.patch<Terminal>(`/terminals/${id}`, { status: 'maintenance' })
```

These are **real REST semantics** — paths, query params, JSON envelopes
(`{ data, meta: { page, pageSize, total } }`). While the backend doesn't exist:

- `VITE_USE_MOCK=true` (default) routes every call to
  [`src/mocks/resolver.ts`](src/mocks/resolver.ts), an in-memory REST resolver seeded from the
  static JSON files in **`src/mocks/data/`** (50 merchants, 300 terminals, 5 000 transactions).
- Mutations persist in memory for the session and append audit-log entries, so the app feels
  alive end-to-end.
- Timestamps are re-anchored to "now" on load, so the seed data never goes stale.

### Switching to the real backend

1. Create `.env` from `.env.example`:
   ```env
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=https://api.your-backend.ge/api
   ```
2. That's it. No UI code changes. `api-client.ts` now issues real `fetch()` calls with a
   `Bearer` token from the session.
3. When the Swagger spec arrives, align any endpoint differences in one place — the feature
   `api.ts` files under `src/features/*/api.ts` (paths/params only; components are unaware).
4. Optionally delete `src/mocks/` entirely — it is lazy-loaded and excluded from the bundle
   when `VITE_USE_MOCK=false`.

The full mock API surface (the contract the backend should implement) is the route table in
`src/mocks/resolver.ts` — auth, dashboard, merchants, terminals, transactions,
failed-transactions, analytics, commissions, users, audit-logs, alerts, system-logs, reports,
settings, search.

### Regenerating mock data

```bash
pnpm generate:mocks   # deterministic faker seed -> src/mocks/data/*.json
```

## Project structure

```
src/
├── routes/             # TanStack Router file-based routes (route per module)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── layout/         # AppSidebar (white active pill), Topbar, CommandPalette
│   ├── shared/         # DataTable, StatCard, StatusText, PeriodPicker, Can, ...
│   └── charts/         # Recharts wrappers themed for the dark navy palette
├── features/<module>/  # api.ts (query/mutation hooks + key factories), schemas, components
├── mocks/              # resolver.ts (mock REST), db.ts, data/*.json  ← delete after swap
├── lib/                # api-client, permissions (RBAC matrix), format (₾), csv, session
├── stores/             # auth.store (session), ui.store (sidebar, prefs)
└── types/              # domain models
```

## Security model

- Login → 2FA (OTP) → session token in Zustand/localStorage
- Idle timeout (default 15 min, configurable in Settings) → auto-logout with notice
- Route guards via `beforeLoad`; element-level gating via `<Can permission="...">`
- RBAC matrix in [`src/lib/permissions.ts`](src/lib/permissions.ts)
- Every mutation writes an audit-log entry with field-level diff
