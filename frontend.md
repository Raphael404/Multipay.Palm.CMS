# Admin API — რა გვერდზე რომელი endpoint

ბაზა: `/api/v1/admin`  
ჰედერი: `Authorization: Bearer {token}`  
Enum-ები სტრინგია. Query/body camelCase.

ლოგინი: `POST /api/v1/admin/auth/login`  
body: `{ email, password }` → `{ token, email, role }`

როლები: `SuperAdmin` | `Admin` | `Operator`

სიის პასუხი ან პირდაპირ `{ items, page, pageSize, totalCount, totalPages }`-ია, ან ამ ობიექტი ველშია ჩალაგებული. ქვემოთ სადაც wrapper არის, ეწერება.

---

## Dashboard — `/`

| UI | Endpoint |
|---|---|
| KPI ბარათები | `GET /dashboard/kpis` |
| Hourly Volume | `GET /dashboard/hourly-volume` |
| Success / Fail Ratio | `GET /dashboard/success-ratio` |
| Merchant Activity | `GET /dashboard/top-merchants?limit=5` |
| Recent Transactions | `GET /dashboard/recent-transactions?limit=10` |
| Recent Transactions → View All | `GET /transactions` |
| Merchant Activity → View All / სტრიქონი | `GET /merchants` და `GET /merchants/{id}` |
| Export CSV | `POST /transactions/export` |

## Merchants — `/merchants`

| UI | Endpoint |
|---|---|
| ცხრილი, სტატუსის ფილტრი, გვერდები | `GET /merchants?search=&status=&page=1&pageSize=20` |
| სტრიქონი / დეტალი Overview | `GET /merchants/{id}` |
| ჩანართი Terminals | `GET /merchants/{id}/terminals` |
| ჩანართი Turnover | `GET /merchants/{id}/turnover?days=30` |
| ჩანართი Transactions | `GET /merchants/{id}/transactions?page=1&pageSize=20` |
| რედაქტირება | `PUT /merchants/{id}` |

სია: `{ merchants: { items, ... } }`  
`status`: `Active` | `Deactivated` | `Cancelled`

## Palm Terminals — `/terminals`

| UI | Endpoint |
|---|---|
| ცხრილი, ძებნა, სტატუსი, მერჩანტი | `GET /terminals?search=&status=&merchantId=&page=1&pageSize=20` |
| დეტალი | `GET /terminals/{id}` |
| მოწყობილობის მიბმა | `POST /terminals/{id}/device/assign` |
| მოწყობილობის მოხსნა | `DELETE /terminals/{id}/device/unassign` |
| Activate | `PUT /terminals/{id}/activate` |
| Suspend | `PUT /terminals/{id}/suspend` |
| Resume | `PUT /terminals/{id}/resume` |

სია პირდაპირ `{ items, ... }`ა.  
`status`: `Active` | `Inactive` | `Deactivated` | `Suspended` | `Registered` | `Provisioned`

## Transactions — `/transactions`

| UI | Endpoint |
|---|---|
| ცხრილი და ფილტრები | `GET /transactions?search=&dateFrom=&dateTo=&status=&merchantId=&terminalId=&page=1&pageSize=20` |
| დეტალი | `GET /transactions/{id}` |
| CSV | `POST /transactions/export` — body იგივე ფილტრებია, pagination-ის გარეშე. პასუხი ფაილია |

სია: `{ transactions: { items, ... } }`  
`status`: `Pending` | `Matched` | `Failed` | `Cancelled` | `Completed` | `Authorized` | `RefundedByCustomer` | `RefundedBySystem`

## Failed Monitoring — `/failed-transactions`

ყველა query: `days` (default `7`), სიაზე კიდევ `page`, `pageSize`.

| UI | Endpoint |
|---|---|
| ზედა მეტრიკები | `GET /failed-monitoring/metrics?days=7` |
| Failures by reason | `GET /failed-monitoring/by-reason?days=7` |
| Fail rate over time | `GET /failed-monitoring/timeline?days=7` |
| ცხრილი | `GET /failed-monitoring?days=7&page=1&pageSize=20` |

სია პირდაპირ `{ items, ... }`ა.

## Analytics — `/analytics`

`period`: `today` | `7d` | `30d` | `custom`  
`custom`-ზე სავალდებულოა `dateFrom` და `dateTo`.

| UI | Endpoint |
|---|---|
| Overview | `GET /analytics/overview?period=30d` |
| By Merchant | `GET /analytics/by-merchant?period=30d&page=1&pageSize=20` |
| By Terminal | `GET /analytics/by-terminal?period=30d&page=1&pageSize=20` |
| Hourly / Daily | `GET /analytics/time-series?period=30d&granularity=daily` |

`granularity`: `hourly` | `daily`

## Reports — `/reports`

body: `{ reportType, dateFrom, dateTo, merchantId? }`  
`reportType`: `Turnover` | `Settlement` | `Failed`

| UI | Endpoint |
|---|---|
| პრევიუ | `POST /reports/preview` |
| ექსპორტი | `POST /reports/export` → `{ id, fileName, rowCount, createdAt }` |
| გადმოწერა | `GET /reports/{id}/download` |
| ბოლო ექსპორტები | `GET /reports/recent?limit=10` |

## Users & Roles — `/users`

| UI | Endpoint |
|---|---|
| ცხრილი | `GET /users?search=&role=&page=1&pageSize=20` |
| Invite | `POST /users/invite` |
| როლის შეცვლა | `PATCH /users/{id}/role` body `{ role }` |
| Disable / Enable | `PATCH /users/{id}/status` body `{ isActive }` |

სია: `{ users: { items, ... } }`  
Invite body: `{ email, phoneNumber, firstName, lastName, password, role }`  
Invite, role და status მხოლოდ `SuperAdmin`-ს შეუძლია. სია — `SuperAdmin` და `Admin`.

---
