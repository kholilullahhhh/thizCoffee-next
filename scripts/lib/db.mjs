import path from 'node:path';
import { promises as fs } from 'node:fs';

export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
}

export async function openDb() {
  // CLI tasks (migrate/setup/seed/create-admin) prefer Neon's direct
  // connection. The app runtime uses DATABASE_URL, which can be pooled.
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    if (isProduction()) {
      throw new Error(
        'DATABASE_URL is required in production. Use a managed PostgreSQL database (Neon, Supabase, Railway, etc.).'
      );
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.PGLITE_DATA_DIR || path.resolve('.data', 'pglite');
    await fs.mkdir(path.dirname(dataDir), { recursive: true });
    const pg = new PGlite(dataDir);
    await pg.waitReady;

    return {
      kind: 'pglite',
      async query(sql, params = []) {
        return (await pg.query(sql, params)).rows;
      },
      async execute(sql) {
        await pg.exec(sql);
      },
      async transaction(fn) {
        return pg.transaction(async (tx) => {
          const adapter = {
            query: async (sql, params = []) => (await tx.query(sql, params)).rows,
          };
          return fn(adapter);
        });
      },
      async close() {
        await pg.close();
      },
    };
  }

  const { default: pg } = await import('pg');
  const local =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    ssl: local ? undefined : { rejectUnauthorized: false },
  });

  return {
    kind: 'postgres',
    async query(sql, params = []) {
      return (await pool.query(sql, params)).rows;
    },
    async execute(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const adapter = {
          query: async (sql, params = []) => (await client.query(sql, params)).rows,
        };
        const result = await fn(adapter);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export async function applySchema(db) {
  const schemaPath = path.resolve('db', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  await db.execute(sql);
}

export async function tableCount(db, table) {
  const rows = await db.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
  return rows[0]?.count ?? 0;
}
