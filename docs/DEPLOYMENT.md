# Deployment Guide

The project deploys as a normal Next.js app on Netlify with
`@netlify/plugin-nextjs`. There is **no static export**. The landing page and the
dashboard are served by the same Next.js deployment.

## 1. Provision PostgreSQL

Use a managed PostgreSQL 14+ service (Neon, Supabase, Railway, RDS, etc.).
Create a dedicated database and copy a connection string with SSL enabled, for
example:

```text
postgresql://thizcoffee:password@db.example.com:5432/thizcoffee?sslmode=require
```

Keep the database firewall open to Netlify build/runtime traffic. The app creates
a `pg` pool per server instance using `DATABASE_URL`.

## 2. Prepare local deploy environment

```bash
npm install
DATABASE_URL="postgresql://..." npm run db:migrate
DATABASE_URL="postgresql://..." \
ADMIN_EMAIL="owner@example.com" \
ADMIN_PASSWORD="a-long-random-password" \
ADMIN_NAME="Owner Thiz Coffee" \
npm run db:create-admin
```

Do **not** run `npm run db:seed` against production. It only runs when
`SEED_DEMO=true`, and demo data should not be mixed with real business data.

## 3. Netlify configuration

`netlify.toml` contains:

```toml
[build]
command = "node scripts/migrate.mjs && npm run build"
publish = ".next"

[build.environment]
NODE_VERSION = "20"

[[plugins]]
package = "@netlify/plugin-nextjs"
```

Migrations are applied on every deploy. `db/schema.sql` is designed to be
idempotent. The current schema includes an `ALTER TABLE` for the financial
category constraint; on a large production database, run migrations during a
maintenance window rather than during peak traffic.

Set these Netlify environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Managed PostgreSQL connection string |
| `DATABASE_POOL_MAX` | Optional; default `5` |
| `NODE_VERSION` | Already set to `20` in `netlify.toml` |

Do not set `PGLITE_DATA_DIR` or `SEED_DEMO` in production.

## 4. Deploy

Using the Netlify UI:

1. Connect the repository.
2. Build command and publish directory come from `netlify.toml`.
3. Add `DATABASE_URL` under **Site configuration → Environment variables**.
4. Trigger the first deploy.
5. Check the deploy log for `Schema database berhasil diterapkan (postgres).`
6. Sign in at `/login` with the owner account created in step 2.

Using the Netlify CLI:

```bash
npm run build
netlify deploy --prod
```

Prefer letting Netlify build so `scripts/migrate.mjs` runs in the deploy
environment. If your database is not reachable from Netlify builds, run
`npm run db:migrate` from a trusted network and remove the migration step from
the build command.

## 5. Post-deploy checklist

- [ ] `/` still renders the public landing page and WhatsApp links.
- [ ] `/login` works over HTTPS.
- [ ] Session cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- [ ] Owner can access all dashboard modules.
- [ ] STAFF cannot access finance/reports/settings.
- [ ] INVENTORY cannot create sales or access finance.
- [ ] Business profile, payment methods, channels, and categories are configured.
- [ ] A test sale deducts product and recipe stock atomically.
- [ ] Duplicate submission with the same idempotency key does not create a second order or payment.
- [ ] Cancelling the test sale restores stock, refunds paid cash, and marks it cancelled.
- [ ] CSV exports download with a BOM and open correctly in Excel.
- [ ] Receipt/report print preview hides the dashboard shell.
- [ ] Audit log records the test actions.

## 6. Security notes

- Passwords are hashed with `scrypt`; session tokens are random 32-byte values
  stored only as SHA-256 hashes.
- Sessions live in PostgreSQL, so deploys and serverless instance restarts do not
  invalidate logins.
- All mutating API routes check the `Origin` header against the request host
  (CSRF protection) and require a server-side role.
- Login attempts are rate-limited in-process per IP + email. On serverless
  hosting this limiter is best-effort across instances; add an edge/WAF rate
  limit for stricter production protection.
- Security headers are set in `next.config.js`: `nosniff`, `DENY` framing,
  strict referrer policy, and restricted browser permissions.
- There is no email-based password reset. An owner resets passwords from
  **Settings → Users**, and the affected sessions are revoked immediately.

## 7. Backups and operations

- Enable automated daily backups and point-in-time recovery in the PostgreSQL
  provider.
- Test a restore before relying on backups.
- Keep `DATABASE_POOL_MAX` small on serverless databases with connection limits.
- Sessions are cleaned up lazily on login. Expired sessions are harmless but can
  be purged periodically if needed.
- Audit logs are append-only from the application UI and should be retained
  according to business policy.

## 8. Rollback

Application rollback is a normal Netlify deploy rollback. Database schema changes
are additive/idempotent in the current release; do not drop columns or tables
during an application rollback. If a future migration is destructive, ship it as
a separately reviewed step with a backup and a reverse migration plan.
