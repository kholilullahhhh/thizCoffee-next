import { openDb, applySchema, getDatabaseConnectionSource } from './lib/db.mjs';

const source = getDatabaseConnectionSource();
const db = await openDb();
try {
  await applySchema(db);
  console.log(
    `Schema database berhasil diterapkan (${db.kind}${source ? `, koneksi: ${source}` : ''}).`
  );
} finally {
  await db.close();
}
