import { openDb, getDatabaseConnectionSource } from './lib/db.mjs';

const source = getDatabaseConnectionSource();
const db = await openDb();
try {
  const info = await db.query(
    `SELECT current_database() AS database, current_user AS username,
            current_setting('server_version') AS version`
  );
  const tables = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const row = info[0] || {};
  console.log(`Koneksi database: ${db.kind}`);
  if (source) console.log(`Sumber env: ${source}`);
  console.log(`Database: ${row.database || '-'}`);
  console.log(`User: ${row.username || '-'}`);
  console.log(`PostgreSQL: ${row.version || '-'}`);
  console.log(`Tabel public: ${tables[0]?.count ?? 0}`);
  console.log('Koneksi database berhasil.');
} finally {
  await db.close();
}
