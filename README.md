# Palm Pay Admin Panel

Web-based CMS for the Palm Pay palm-vein payment infrastructure: operational, financial and
technical management of merchants, palm-authentication terminals and transactions.

**React 19 + TypeScript (strict) + Vite + Tailwind v4 + shadcn/ui + TanStack Router/Query/Table +
Recharts + Zod + Zustand.**

## Quick start

```bash
cp .env.example .env   # point VITE_API_PROXY_TARGET at the backend
pnpm install
pnpm dev               # http://localhost:5173
pnpm build             # type-check + production build
```

## Backend

The app talks to the Admin API described in [`openapi.json`](openapi.json); the page → endpoint
map is in [`frontend.md`](frontend.md).

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Admin API base path, default `/api/v1/admin`. Can be an absolute URL if the backend allows CORS. |
| `VITE_API_PROXY_TARGET` | Dev only. Backend origin the Vite dev server proxies `/api` to (avoids CORS locally). |

- Login: `POST /auth/login` `{ email, password }` → `{ token, email, role }`. The token is sent as
  `Authorization: Bearer` on every request; a `401` clears the session and returns to login.
- Idle timeout: 15 minutes of inactivity logs the user out.
- Roles: `SuperAdmin`, `Admin`, `Operator`. Users & Roles is visible to SuperAdmin and Admin;
  invite / change role / enable–disable are SuperAdmin only. The backend enforces the real rules —
  the UI only hides what a role cannot do (see [`src/lib/permissions.ts`](src/lib/permissions.ts)).

## Modules

Dashboard · Merchants (list, detail: overview / terminals / turnover / transactions, edit) ·
Palm Terminals (list, detail, assign / unassign device, activate / suspend / resume) ·
Transactions (filters, detail, CSV export) · Failed Monitoring · Analytics · Reports
(preview, export, download, recent exports) · Users & Roles.

## Project structure

```
src/
├── routes/             # TanStack Router file-based routes (one per module)
├── components/
│   ├── ui/             # shadcn/ui primitives
│   ├── layout/         # AppSidebar, Topbar
│   ├── shared/         # DataTable, StatCard, StatusText, PeriodPicker, Can, ...
│   └── charts/         # Recharts wrappers
├── features/<module>/  # api.ts (query/mutation hooks + key factories), components
├── lib/                # api-client, permissions, format, session (idle logout)
├── stores/             # auth.store (session), ui.store (sidebar)
└── types/              # API types mirroring openapi.json
```
