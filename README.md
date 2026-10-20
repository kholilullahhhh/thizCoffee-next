# THIZ COFFEE — Landing Page & Business Dashboard

Next.js App Router application for **THIZ COFFEE (MotoBrewa)**, a bottled-coffee
delivery business in Makassar. The public landing page at `/` is preserved. The
internal operations dashboard lives under `/dashboard` and uses the same visual
identity: orange `#FF5A1F`, near-black `#0A0A0A`, Bebas Neue headings, and Inter
body text.

## Stack

- Next.js `13.5.1`, React `18.2.0`, TypeScript `5.2.2`, Tailwind CSS `3.3.3`
- PostgreSQL via `pg` in production
- Embedded PGlite for local development (same SQL schema)
- Raw parameterized SQL, no ORM
- Server-side sessions, scrypt password hashing, role-based access control
- Recharts for dashboard charts

## Features

### Public site

- Original landing page, WhatsApp order CTAs, menu, testimonials, and animations
- Dashboard-only responsive dark/light theme and print-friendly receipt/report views

### Dashboard

| Area | Route | What it covers |
| --- | --- | --- |
| Overview | `/dashboard` | Revenue, COGS, profit, cash, receivables, targets, low stock, recent activity |
| Sales | `/dashboard/sales` | Atomic sale creation, line items, discounts, delivery fees, initial payment |
| Orders | `/dashboard/orders` | Search, status/payment filters, sorting, pagination, detail, receipt, payments, status flow, cancellation/refund |
| Products | `/dashboard/products` | Products, selling price, cost snapshot, recipe/ingredients, categories |
| Inventory | `/dashboard/inventory` | Ingredients/packaging, recipes impact, stock adjustments, purchase expenses, stock ledger |
| Finance | `/dashboard/finance` | Cash book, income/expenses, period summaries, void rules, manual entries |
| Reports | `/dashboard/reports` | Daily/range reports, profit narrative, product and payment breakdowns, print/CSV |
| Customers | `/dashboard/customers` | Customer records, contact details, order history links |
| Suppliers | `/dashboard/suppliers` | Supplier records and inventory purchase linkage |
| Settings | `/dashboard/settings` | Business profile, users/RBAC, payment methods, channels, product/financial categories |
| Audit log | `/dashboard/settings/audit` | Filterable, paginated audit trail |

CSV export: `/api/export?type=orders|finance|report|stock|products&from=YYYY-MM-DD&to=YYYY-MM-DD`.
Print styling covers order receipts and reports.

## Roles

| Role | Access |
| --- | --- |
| `OWNER` | Everything, including finance, reports, settings, users, and audit log |
| `STAFF` | Overview, sales, orders, customers; no finance, inventory, reports, or settings |
| `INVENTORY` | Overview, products, inventory, suppliers; no sales/orders, finance, reports, or settings |

Authorization is enforced on the server in page guards and API route handlers.
Hiding a menu item is not treated as security.

## Local development

Requirements: Node.js 20 LTS or newer and npm.

```bash
npm install
npm run dev
```

`npm run dev` runs `scripts/setup.mjs` first. Without `DATABASE_URL`, the app uses
embedded PGlite in `.data/pglite` and seeds demo data on first run.

Demo accounts (development only, password `thizcoffee123`):

- `owner@thiz.coffee`
- `staff@thiz.coffee`
- `inventory@thiz.coffee`

Do not use these credentials or the development seed in production.

## Production database

Set `DATABASE_URL` to a managed PostgreSQL database before running migrations or
starting the app:

```bash
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require" npm run db:migrate
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require" npm run db:create-admin
```

`npm run db:create-admin` prompts via environment variables or CLI arguments and
creates/updates an `OWNER` account. It does not seed demo transactions.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Production | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | No | Connection pool size (default `5`) |
| `PGLITE_DATA_DIR` | No | Local PGlite directory (default `.data/pglite`) |
| `SEED_DEMO_PASSWORD` | No | Development seed password (default `thizcoffee123`) |
| `SEED_DEMO` | No | Set to `true` to allow demo seeding against production |
| `ADMIN_EMAIL` | Admin bootstrap | Production owner email |
| `ADMIN_PASSWORD` | Admin bootstrap | Production owner password |
| `ADMIN_NAME` | No | Production owner display name |

Never commit `.env` files. `.env.example` documents the variables.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server; auto-migrates and seeds PGlite |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript without emit |
| `npm run build` | Production build |
| `npm run start` | Start a production build |
| `npm run db:migrate` | Apply `db/schema.sql` |
| `npm run db:setup` | Apply schema and seed demo data if the database is empty |
| `npm run db:seed` | Seed demo data (skips non-empty databases; production requires `SEED_DEMO=true`) |
| `npm run db:reset` | Delete local PGlite data, or require explicit confirmation for PostgreSQL |
| `npm run db:create-admin` | Create/update an owner account |

## Documentation

- [Setup guide](docs/SETUP.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Accounting and stock rules](docs/ACCOUNTING.md)
- [Verification results, file summary, limitations](docs/CHANGES.md)

## Known limitations

- `npm run build` requires outbound access to Google Fonts for `next/font/google`.
  The final build passed in this workspace; an offline build can fail only at that
  step with `Failed to fetch Inter`.
- Production PostgreSQL behavior is implemented with `pg`, but local verification
  in this workspace was performed against PGlite because PostgreSQL/Docker was not
  available.
- The legacy `components/ui/*` shadcn files and `hooks/use-toast.ts` remain unused
  template scaffolding; the live landing page and dashboard use raw Tailwind.
