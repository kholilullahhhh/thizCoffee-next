import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

export interface DbExecutor {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]>;
}

export interface Db extends DbExecutor {
  kind: 'pglite' | 'postgres';
  execute(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
}

type PGliteLike = {
  query<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  transaction<T>(fn: (tx: { query: PGliteLike['query'] }) => Promise<T>): Promise<T>;
  waitReady: Promise<void>;
};

const globalForDb = globalThis as typeof globalThis & {
  __thizCoffeeDb?: Promise<Db>;
};

const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'NETLIFY_DB_URL',
  'NETLIFY_DATABASE_URL',
] as const;

function cleanEnvValue(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getDatabaseUrlSource(): string | undefined {
  for (const key of DATABASE_URL_KEYS) {
    if (cleanEnvValue(process.env[key])) return key;
  }
  return undefined;
}

export function getDatabaseUrl(): string | undefined {
  const source = getDatabaseUrlSource();
  return source ? cleanEnvValue(process.env[source]) : undefined;
}

function postgresPool(connectionString: string): Pool {
  const isLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: 'thiz-coffee-web',
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
  });
}

async function applySchema(exec: (sql: string) => Promise<unknown>) {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  await exec(sql);
}

async function createPostgresDb(connectionString: string): Promise<Db> {
  const pool = postgresPool(connectionString);
  const executor: DbExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params as never[]);
      return result.rows as T[];
    },
  };

  return {
    kind: 'postgres',
    ...executor,
    async execute(sql: string) {
      await pool.query(sql);
    },
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      const client: PoolClient = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx: DbExecutor = {
          async query<U extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
            const result = await client.query(sql, params as never[]);
            return result.rows as U[];
          },
        };
        const value = await fn(tx);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function createPgliteDb(): Promise<Db> {
  // Imported lazily so production deployments that use DATABASE_URL never
  // load the embedded WebAssembly database.
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir =
    process.env.PGLITE_DATA_DIR || path.join(process.cwd(), '.data', 'pglite');
  await fs.mkdir(path.dirname(dataDir), { recursive: true });

  const pg = new PGlite(dataDir) as unknown as PGliteLike;
  await pg.waitReady;

  const exists = await pg.query<{ exists: boolean }>(
    "SELECT to_regclass('public.users') IS NOT NULL AS exists"
  );
  if (!exists.rows[0]?.exists) {
    await applySchema((sql) => pg.exec(sql));
  }

  const executor: DbExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const result = await pg.query<T>(sql, params);
      return result.rows;
    },
  };

  return {
    kind: 'pglite',
    ...executor,
    async execute(sql: string) {
      await pg.exec(sql);
    },
    async transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      return pg.transaction((tx) =>
        fn({
          async query<U extends Record<string, unknown>>(
            sql: string,
            params: unknown[] = []
          ) {
            const result = await tx.query<U>(sql, params);
            return result.rows;
          },
        })
      );
    },
  };
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__thizCoffeeDb) {
    const production = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';
    const connectionString = getDatabaseUrl();
    const promise =
      !connectionString && production
        ? Promise.reject(
            new Error(
              'DATABASE_URL is required in production. Set DATABASE_URL (or the Netlify Neon variable NETLIFY_DB_URL / NETLIFY_DATABASE_URL).'
            )
          )
        : connectionString
          ? createPostgresDb(connectionString)
          : createPgliteDb();
    globalForDb.__thizCoffeeDb = promise;
    // Never cache an initialization failure: a later request can retry after
    // the environment is fixed or a transient startup error clears.
    promise.catch(() => {
      if (globalForDb.__thizCoffeeDb === promise) {
        delete globalForDb.__thizCoffeeDb;
      }
    });
  }
  return globalForDb.__thizCoffeeDb;
}
