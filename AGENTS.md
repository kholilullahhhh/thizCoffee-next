# AGENTS.md

Thiz Coffee (MotoBrewa) is a Next.js App Router application with a preserved
public landing page at `/` and an internal business dashboard under `/dashboard`.
The dashboard covers inventory, sales, finance, reporting, customers, suppliers,
settings, RBAC, audit logs, and real persistence.

The dashboard is not a static demo. It uses server-side auth/session checks,
parameterized SQL, atomic stock/order operations, and an idempotent development
seed. See `docs/ACCOUNTING.md` before changing financial or inventory logic.

## Commands

- `npm run dev` — local dev server (http://localhost:3000). `predev` runs
  `scripts/setup.mjs`, which applies the schema and seeds PGlite when empty.
- `npm run lint` and `npm run typecheck` — run both before finishing. There is no
  automated test suite, formatter config, or CI.
- `npm run build` — production build. Needs outbound access to Google Fonts for
  `next/font/google`; offline builds can fail only with `Failed to fetch Inter`.
- `next.config.js` sets `eslint.ignoreDuringBuilds: true`, so run lint explicitly.
- Database: `db:migrate`, `db:setup`, `db:seed`, `db:reset`, `db:create-admin`.
  Local reset deletes `.data/pglite`; PostgreSQL reset requires `--force` and
  `CONFIRM_RESET=YES`.

Baseline: typecheck is clean. Lint has one pre-existing warning
(`@next/next/no-page-custom-font`) for the Bebas Neue `<link>` in
`app/layout.tsx`; do not treat it as a regression.

## Architecture

- `app/page.tsx` and `components/*.tsx` (except dashboard/auth components) are the
  preserved public landing page. Do not break WhatsApp CTAs, animations, or
  brand visuals while changing the dashboard.
- `app/layout.tsx` wraps everything in the theme provider/toaster and loads fonts.
- `app/(auth)/login` is the dashboard login. `app/(dashboard)/dashboard/**` holds
  the dashboard pages and shell; `app/api/**` holds JSON route handlers.
- Mutations use route handlers, not Server Actions. `lib/api.ts` provides auth,
  JSON parsing, CSRF origin checks, and error mapping.
- `lib/auth/session.ts` uses opaque session tokens in an httpOnly cookie, SHA-256
  token hashes, and server-side role guards. Menu hiding is never the only guard.
- `lib/db.ts` uses `pg` when `DATABASE_URL` is set; otherwise embedded PGlite at
  `.data/pglite` for development. Raw parameterized SQL, no ORM.
- `db/schema.sql` is the single schema for both databases and is idempotent.
  Production Netlify builds run `node scripts/migrate.mjs` before `next build`.
- `components/dashboard/*` are client components only where state/effects/Recharts
  require it; pages/query work stays on the server.
- `hooks/use-in-view.ts` is the landing-page scroll-reveal helper.
- `components/ui/*` (47 shadcn files) and `hooks/use-toast.ts` are unused template
  scaffolding. The live site uses raw Tailwind. Do not assume those primitives or
  `<Toaster />` are wired in.

Next 13.5.1 / React 18.2 are pinned. Avoid Next 14/15-only APIs.

## Data and accounting invariants

- Roles: `OWNER`, `STAFF`, `INVENTORY`.
- Order statuses: `NEW`, `PROCESSING`, `READY`, `COMPLETED`, `CANCELLED`.
  Payment statuses: `UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`.
- Revenue is non-cancelled order totals; COGS uses item cost snapshots; gross =
  revenue − COGS; net = gross − operating expenses + other income. Inventory
  purchases are cash out but not an operating expense. `CAPITAL` entries are cash
  in but not revenue or profit.
- Cancelling restores product/recipe stock from original sale movements, keeps
  original payment income, records a refund expense, and marks the order
  cancelled/refunded. Sales/payment finance entries cannot be voided directly.
- Stock and sale operations must be atomic and idempotent. Never allow negative
  stock. Dedupe keys/idempotency keys are database-backed; preserve them.
- Manual finance entries are limited to `OTHER_INCOME`, `OPERATING_EXPENSE`, and
  `INVENTORY_PURCHASE`. System categories cannot be deactivated.
- Payment method and order channel codes are uppercase in the database; normalize
  inputs before lookups/writes.
- Business day boundaries use `Asia/Makassar` (WITA, UTC+8); ranges use an
  exclusive next-day end.
- Seed IDs include products `prod-kopi-aren`, `prod-caramel`, `prod-vanilla`,
  `prod-matcha`; matcha is intentionally below minimum stock. Development
  accounts are `owner@thiz.coffee`, `staff@thiz.coffee`, and
  `inventory@thiz.coffee` with password `thizcoffee123`.

## Content and styling

- All landing business content is hardcoded in each landing section component.
- Brand palette is hardcoded hex, not theme tokens: orange `#FF5A1F` (hover
  `#E04A10`), near-black `#0A0A0A`.
- Headings use Bebas Neue via a `<link>` in `app/layout.tsx` and inline
  `fontFamily`; body text uses Inter via `next/font/google`.
- Landing animation classes (`animate-bounce-slow`, `animate-fade-up`, `.delay-*`)
  live in `app/globals.css`. Dashboard classes (`.dashboard-input`, tables,
  panels) and print rules also live there.
- Print views hide the dashboard shell with Tailwind `print:*` classes and the
  `.print-hidden`/`.print-area` rules. Keep both receipt and report print paths
  working.
- The WhatsApp order number `https://wa.me/628001234567` is duplicated in
  `CTASection.tsx`, `Footer.tsx`, `HowItWorks.tsx`, and `WhatsAppButton.tsx`.
  Update every occurrence when contact info changes.

## Deployment

- Netlify uses `@netlify/plugin-nextjs`, publishes `.next`, pins Node 20, and runs
  migrations before building. This is not a static export.
- Production requires `DATABASE_URL`; PGlite fallback is disabled when
  `NODE_ENV=production` or `NETLIFY=true`.
- Do not seed demo data in production (`SEED_DEMO=true` would be required).
- Security headers are set in `next.config.js`. Keep CSRF origin checks, session
  revocation on password reset/deactivation, and server-side role checks intact.
- Setup/deploy/accounting details live in `docs/SETUP.md`, `docs/DEPLOYMENT.md`,
  `docs/ACCOUNTING.md`; verification status is in `docs/CHANGES.md`.
