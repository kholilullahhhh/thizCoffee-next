import { NextResponse } from 'next/server';
import { getDatabaseUrl, getDatabaseUrlSource, getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };

  if (!getDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        database: 'unconfigured',
        message:
          'DATABASE_URL or a Netlify database variable (NETLIFY_DB_URL / NETLIFY_DATABASE_URL) is not available at runtime.',
      },
      { status: 503, headers }
    );
  }

  const started = Date.now();
  try {
    const db = await getDb();
    const rows = await db.query<{ schema_ready: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
       ) AS schema_ready`
    );
    const schemaReady = Boolean(rows[0]?.schema_ready);
    let usersReady = false;
    if (schemaReady) {
      const userRows = await db.query<{ users_ready: boolean }>(
        'SELECT EXISTS (SELECT 1 FROM users WHERE active = TRUE) AS users_ready'
      );
      usersReady = Boolean(userRows[0]?.users_ready);
    }
    const ok = schemaReady && usersReady;
    return NextResponse.json(
      {
        ok,
        database: 'connected',
        source: getDatabaseUrlSource(),
        schemaReady,
        usersReady,
        latencyMs: Date.now() - started,
        message: !schemaReady
          ? 'Database connected, but the schema has not been migrated.'
          : !usersReady
            ? 'Database schema is ready, but no active user exists. Create an owner account.'
            : 'Database connected.',
      },
      { status: ok ? 200 : 503, headers }
    );
  } catch (error) {
    console.error('[health] database check failed', error);
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    return NextResponse.json(
      {
        ok: false,
        database: 'unreachable',
        code: code || undefined,
        message: 'Database connection failed. Check the server logs.',
      },
      { status: 503, headers }
    );
  }
}
