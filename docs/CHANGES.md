# Verification, File Summary, and Limitations

Verification run: **20 October 2026** (business timezone `Asia/Makassar`).

## Commands and exact results

| Command | Result |
| --- | --- |
| `npm run typecheck` | **PASS** — `tsc --noEmit` produced no output |
| `npm run lint` | **PASS with one warning** — `@next/next/no-page-custom-font` at `app/layout.tsx:18` for the Bebas Neue `<link>` (pre-existing landing-page pattern) |
| `npm run build` | **PASS** — compiled successfully, types valid, static pages generated `16/16` |
| `npm run db:reset` | **PASS** — deleted local `.data/pglite` |
| `npm run db:setup` | **PASS** — applied schema and seeded demo data with the three development accounts |
| `npm run db:check` | **PASS** — reports the active database kind, version, and public table count |

Build output included all application/dashboard routes and 23 API route handlers.
`next build` reports `Skipping linting` because `next.config.js` sets
`eslint.ignoreDuringBuilds: true`; lint was run separately as shown above.

## Manual end-to-end checks

There is no automated test suite. The following were exercised through the
running Next.js app and authenticated HTTP requests.

### Authentication and authorization

- Owner, staff, and inventory demo accounts logged in successfully.
- Invalid password and deactivated account returned `401`.
- Password reset revoked the old session immediately (`401` afterwards); the new
  password worked and the documented demo password was restored.
- Staff finance API call returned `403`.
- Inventory order creation returned `403`.
- Inventory finance CSV export returned `403`; anonymous export and order POST
  returned `401`.
- Cross-origin mutation returned `403` ("Permintaan lintas situs ditolak").
- Self-demotion of the only active owner returned `409`; self-deactivation
  returned `409`.

### Landing and dashboard rendering

Authenticated requests returned **HTTP 200** for:

`/`, `/login`, `/dashboard`, `/dashboard/sales`, `/dashboard/orders`,
`/dashboard/products`, `/dashboard/inventory`, `/dashboard/finance`,
`/dashboard/reports`, `/dashboard/customers`, `/dashboard/suppliers`,
`/dashboard/settings`, `/dashboard/settings/audit`, and an order detail page.

Role-restricted pages redirect unauthorized roles to the overview with a
`denied=1` notice before page data is queried; restricted APIs enforce `403`.
The orders list was also exercised with combined search, status/payment
filters, all sort modes, and pagination (`HTTP 200`).

### Sales, payments, cancellation, and stock

- Sale creation returned `201`; replaying the same idempotency key returned
  `200` with the same order ID and `alreadyExisted: true`.
- Initial payments created the order payment and matching cash income entry.
- Partial payment followed by full payment updated the order to `PAID`.
- Replaying a payment idempotency key returned `alreadyExisted: true` without a
  second payment.
- Overpayment was rejected with `409`.
- Cancelling a paid order restored stock, created `RETURN` movements, recorded
  the refund, set `REFUNDED`, and returned the refunded amount.
- The order receipt page rendered after cancellation.
- Product and recipe ingredients were deducted on sale and restored on cancel;
  database checks found **zero negative product or ingredient stocks**.
- Stock purchase adjustment applied stock and expense exactly once on replay.
- Wastage reduced stock; an impossible negative adjustment returned `409`.
- Duplicate product/ingredient rows in one adjustment returned `422`.
- Invalid payment method for an expense adjustment returned `422`.
- Product recipe duplicate/missing-inactive ingredient returned `422`.
- Manual finance entry replay returned `201` then `200` with the same entry ID.
- Payment methods and order channels are normalized to uppercase; a sale created
  with lowercase `cash`/`direct` stored `CASH`/`DIRECT` in orders, payments, and
  finance entries.
- Sales/payment finance entries cannot be voided directly (`409`); adjustment-
  linked inventory expenses cannot be voided directly (`409`).
- Finance system categories cannot be deactivated (`409`).
- CSV export returned `200`, `text/csv; charset=utf-8`, with UTF-8 BOM `65279`.
- Security headers were present: `nosniff`, `DENY`, strict referrer policy, and
  restricted permissions policy.
- Database audit checks found no duplicate finance dedupe keys and no duplicate
  payment idempotency keys.

## Neon PostgreSQL verification

The production PostgreSQL path was exercised against a Neon database
(PostgreSQL 18.6, region `ap-southeast-1`) using the direct connection for
migration/admin tasks and the pooled connection for the application runtime.

- Schema applied successfully: `Schema database berhasil diterapkan (postgres).`
- Demo seed committed successfully.
- Seed totals: 3 users, 4 products, 8 ingredients, 6 customers, 3 suppliers,
  194 orders, 282 order items, 189 payments, 1,517 stock movements, 199 finance
  entries, 27 audit records, and 20 public tables.
- Order statuses seeded: 157 `COMPLETED`, 18 `READY`, 14 `PROCESSING`,
  5 `CANCELLED`.
- Authenticated application smoke test against Neon returned `200` for
  `/dashboard`, orders with combined filter/sort, finance, reports, inventory,
  and settings. Login returned `200`, and finance CSV export returned a UTF-8 BOM.
- The temporary test session and test login audit were removed afterward.

## Schema summary

`db/schema.sql` defines: users, sessions, business settings, product categories,
products, recipe items, ingredients, suppliers, customers, orders, order items,
payments, stock adjustments/items, stock movements, order channels, payment
methods, financial categories/entries, sequences, and audit logs.

Constraints/indexes cover unique emails, session token hashes, order numbers,
idempotency keys, dedupe keys, non-negative stock, valid order/payment/status
values, role values, and financial category kinds including `CAPITAL`.

## File change summary

### Modified

- `.gitignore` — ignores local database, environment, and build artifacts
- `app/globals.css` — dashboard design system, dark theme, print rules; fixed
  unsupported Tailwind opacity in `@apply`
- `app/layout.tsx` — theme provider and toaster integration while preserving fonts
- `netlify.toml` — runs migrations before build, pins Node 20
- `next.config.js` — PGlite external package, security headers, build lint setting
- `package.json` / `package-lock.json` — `pg`, PGlite, auth/session/UI dependencies
  and database scripts
- `README.md` — replaced stale portfolio README with current application docs

### New

- `app/(auth)/login/page.tsx` — dashboard login
- `app/(dashboard)/dashboard/**` — all dashboard pages, layout, loading, error,
  order detail and receipt
- `app/api/**` — auth, orders, payments, cancellations, products, ingredients,
  stock adjustments, finance/void, customers, suppliers, settings, users,
  configurable lookups, CSV export
- `components/auth/login-form.tsx`
- `components/dashboard/**` — shell, navigation, charts, stat cards, tables,
  modals, pagination, period filters, print button, and module managers
- `components/theme-provider.tsx`, `components/toaster.tsx`
- `db/schema.sql`
- `lib/auth/password.ts`, `lib/auth/session.ts`
- `lib/api.ts`, `lib/audit.ts`, `lib/dates.ts`, `lib/db.ts`, `lib/format.ts`,
  `lib/types.ts`
- `lib/services/analytics.ts`, `inventory.ts`, `order-data.ts`, `orders.ts`,
  `products.ts`
- `scripts/create-admin.mjs`, `migrate.mjs`, `check-db.mjs`, `reset.mjs`,
  `seed.mjs`, `setup.mjs`, `scripts/lib/db.mjs`, `password.mjs`, `seed.mjs`
- `.env.example`, `.env.neon.example`, `AGENTS.md`
- `docs/SETUP.md`, `docs/NEON.md`, `docs/DEPLOYMENT.md`, `docs/ACCOUNTING.md`,
  `docs/CHANGES.md`

### Preserved

- `app/page.tsx` and the landing section components, WhatsApp links, animations,
  brand colors, and Bebas Neue/Inter typography
- `components/ui/*` and `hooks/use-toast.ts` remain unused scaffold files, as
  before this work

## Limitations and follow-ups

1. **Neon is the only production PostgreSQL provider tested.** The `pg` adapter
   and schema were verified against Neon 18.6. Run the same deployment checklist
   against other providers before switching.
2. **No automated test suite.** Verification was manual API/page smoke testing.
   Add integration tests for order/payment idempotency and role guards before
   high-volume production use.
3. **Serverless login rate limiting is best-effort.** The in-process limiter is
   per instance; use a platform/WAF rate limit if brute-force protection must be
   global.
4. **No browser-based visual regression suite.** Responsive, dark/light, print
   preview, keyboard, and screen-reader behavior should get a manual QA pass.
5. **Build requires outbound access** to Google Fonts for `next/font/google`.
   The final build in this run succeeded; an offline build can fail only at that
   step with `Failed to fetch Inter`.
6. **PGlite is single-process development storage**, not a production database
   and not suitable for multiple app instances.
7. **No email-based password reset.** Owners reset passwords from Settings, and
   affected sessions are revoked; there is no "forgot password" email flow.
8. **No attachment upload/storage** for supplier invoices or expense receipts.
9. **Audit retention** is not automated; configure retention/archival in the
   database provider according to business policy.
