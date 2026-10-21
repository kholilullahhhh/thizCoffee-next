# Setup Guide

## 1. Requirements

- Node.js 20 LTS (or newer) and npm
- No local PostgreSQL is required for development; embedded PGlite is used
- For production: a managed PostgreSQL 14+ database

## 2. Install and run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

`npm run dev` runs `scripts/setup.mjs` first:

1. Opens PGlite at `.data/pglite` when `DATABASE_URL` is not set.
2. Applies `db/schema.sql` (idempotent).
3. Seeds demo data only when the `users` table is empty.

Demo accounts, password `thizcoffee123`:

| Email | Role |
| --- | --- |
| `owner@thiz.coffee` | `OWNER` |
| `staff@thiz.coffee` | `STAFF` |
| `inventory@thiz.coffee` | `INVENTORY` |

The seed includes products, recipes, ingredients/packaging, customers,
suppliers, 30 days of orders, payments, stock movements, finance entries,
configuration, and audit history. It is development-only.

## 3. Database modes

### Local PGlite

- Data directory: `.data/pglite` (git-ignored)
- Override with `PGLITE_DATA_DIR`
- Reset: `npm run db:reset`

### PostgreSQL

Create a database and set `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://user:password@host:5432/thizcoffee?sslmode=require"
```

Then apply the schema:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate
```

Create the first owner (no demo data):

```bash
DATABASE_URL="postgresql://..." \
ADMIN_EMAIL="owner@example.com" \
ADMIN_PASSWORD="use-a-long-random-password" \
ADMIN_NAME="Owner Thiz Coffee" \
npm run db:create-admin
```

Alternatively pass the values as flags:

```bash
npm run db:create-admin -- --email owner@example.com --password "long-password"
```

Running the command again updates the same email to an active `OWNER` and resets
its password. It never creates demo transactions.

## 4. Environment variables

Copy `.env.example` to `.env.local` for local Next.js runtime overrides if
needed. CLI scripts read process environment variables; to load a file for them,
use `node --env-file=.env.local scripts/migrate.mjs`.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Production | — | PostgreSQL runtime connection string; required when `NODE_ENV=production` or `NETLIFY=true` |
| `DATABASE_URL_UNPOOLED` | No | — | Direct connection preferred by migration/admin scripts |
| `NETLIFY_DB_URL` / `NETLIFY_DATABASE_URL` | No | — | Auto-detected Netlify Neon/Netlify DB runtime variables |
| `DATABASE_POOL_MAX` | No | `5` | `pg` pool size; use `3` on Neon/serverless |
| `PGLITE_DATA_DIR` | No | `.data/pglite` | Local embedded database |
| `SEED_DEMO_PASSWORD` | No | `thizcoffee123` | Development seed password |
| `SEED_DEMO` | No | — | Must be `true` to seed when production is detected |
| `ADMIN_EMAIL` | Admin bootstrap | — | Owner email |
| `ADMIN_PASSWORD` | Admin bootstrap | — | Owner password, minimum 8 characters |
| `ADMIN_NAME` | No | `Owner Thiz Coffee` | Owner display name |

For Neon production setup, see [NEON.md](NEON.md).

## 5. Database lifecycle commands

```bash
npm run db:check         # verify connection and public table count
npm run db:migrate       # apply db/schema.sql
npm run db:setup         # apply schema + seed only when empty
npm run db:seed          # seed demo data; skips non-empty DBs
npm run db:reset         # local: delete PGlite data
npm run db:create-admin  # create/update an owner account
```

Resetting PostgreSQL is intentionally guarded:

```bash
CONFIRM_RESET=YES npm run db:reset -- --force
```

This drops the **entire public schema**. Use only on a disposable database and
take a backup first.

## 6. First login checklist

1. Open `/login`.
2. Sign in with the owner account.
3. Open **Pengaturan → Profil bisnis** and replace the seeded business phone,
   email, address, target, delivery fee, and receipt note.
4. Review **Pengaturan → Akun & akses** and remove/deactivate any demo accounts.
5. Set up payment methods, order channels, product categories, and financial
   categories before entering transactions.
6. Verify the timezone assumptions: reports use `Asia/Makassar` (WITA, UTC+8).

## 7. Troubleshooting

### `DATABASE_URL is required in production`

Production/PGlite fallback is intentionally disabled. Set `DATABASE_URL` in the
hosting environment.

### Build fails with `Failed to fetch Inter`

`next/font/google` needs outbound access to Google Fonts. This is a network
failure, not a TypeScript/application failure. Run `npm run lint` and
`npm run typecheck` for offline verification.

### Login fails after a password reset

Resetting a password revokes existing sessions. Sign in again with the new
password.

### Stock operations are rejected

Sales and outgoing adjustments never allow negative stock. Purchases must use an
active payment method when recording an expense. See
[ACCOUNTING.md](ACCOUNTING.md).
